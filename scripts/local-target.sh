#!/usr/bin/env bash
# Output a verified local execution descriptor. No fault, session, or load writes.
set -euo pipefail
cd "$(dirname "$0")/.."
for tool in docker curl jq sha256sum; do command -v "$tool" >/dev/null || { echo "Required tool missing: $tool" >&2; exit 1; }; done
fail() { echo "Local target check: $* This check performed no session, fault or workload writes." >&2; exit 1; }
endpoint="${DOCKER_HOST:-$(docker context inspect "$(docker context show)" --format '{{.Endpoints.docker.Host}}')}"
[[ "$endpoint" == unix:///* || "$endpoint" == npipe:///* ]] || fail 'Remote Docker contexts are unsupported.'
config="$(docker compose --profile observability --profile loadtest config --format json)"
jq -e '.services["control-plane"].environment.DEMO_API_URL == "http://demo-api:8081" and .services["control-plane"].environment.DEMO_WORKER_URL == "http://demo-worker:8082" and .services.k6.environment.BASE_URL == "http://demo-api:8081" and (.services.k6.networks | keys) == ["default"] and .networks.default.external != true' <<< "$config" >/dev/null || fail 'Control and k6 must use this Compose default network and canonical demo services.'
binding="$(docker compose port control-plane 8080)"
[[ "$binding" =~ ^127\.0\.0\.1:([0-9]+)$ ]] || fail 'Control-plane must have a single loopback binding.'
port="${BASH_REMATCH[1]}"
requested="${1:-${CONTROL_URL:-http://127.0.0.1:$port}}"; requested="${requested%/}"
[[ "$requested" == "http://127.0.0.1:$port" || "$requested" == "http://localhost:$port" ]] || fail 'CONTROL_URL must match this Compose control-plane binding; changing only CONTROL_URL cannot retarget k6.'
ids=()
for service in mysql redis kafka control-plane demo-api demo-worker web; do
  id="$(docker compose ps -q "$service")"
  [[ -n "$id" && "$id" != *$'\n'* ]] || fail "Exactly one running $service container is required."
  ids+=("$id")
done
containers="$(docker inspect "${ids[@]}")"
project="$(jq -r '.name' <<< "$config")"
jq -e --arg p "$project" --argjson cfg "$config" 'all(.[]; .State.Running and .State.Health.Status == "healthy" and .Config.Labels["com.docker.compose.project"] == $p and (.NetworkSettings.Networks | keys | length) == 1 and .HostConfig.Memory == ($cfg.services[.Config.Labels["com.docker.compose.service"]].mem_limit | tonumber))' <<< "$containers" >/dev/null || fail 'Unhealthy, foreign, or stale container configuration; reapply the chosen .env first.'
networks="$(jq -c '[.[] | .NetworkSettings.Networks | keys] | unique' <<< "$containers")"
[[ "$(jq length <<< "$networks")" == 1 ]] || fail 'Services do not share one Compose network.'
cp="$(jq -c '.[] | select(.Config.Labels["com.docker.compose.service"] == "control-plane")' <<< "$containers")"
jq -e '(.Config.Env | index("DEMO_API_URL=http://demo-api:8081")) != null and (.Config.Env | index("DEMO_WORKER_URL=http://demo-worker:8082")) != null' <<< "$cp" >/dev/null || fail 'Running control-plane points to different demo services.'
profile=core
if jq -e '.Config.Env | index("OTEL_SDK_DISABLED=false") != null' <<< "$cp" >/dev/null; then profile=observability; fi
for service in prometheus grafana loki tempo otel-collector; do
  id="$(docker compose ps -q "$service")"
  if [[ -z "$id" && "$profile" == core ]]; then continue; fi
  [[ -n "$id" && "$id" != *$'\n'* ]] || fail "Observability service missing or ambiguous: $service"
  extra="$(docker inspect "$id")"
  jq -e --arg p "$project" --argjson cfg "$config" '.[0] | .State.Running and (.State.Health.Status // "healthy") == "healthy" and .Config.Labels["com.docker.compose.project"] == $p and .HostConfig.Memory == ($cfg.services[.Config.Labels["com.docker.compose.service"]].mem_limit | tonumber)' <<< "$extra" >/dev/null || fail "Observability service unavailable/stale: $service"
  containers="$(jq -nc --argjson a "$containers" --argjson b "$extra" '$a+$b')"
done
host_ports="$(jq -c '{controlPlane:(.services["control-plane"].ports[0].published|tonumber),demoApi:(.services["demo-api"].ports[0].published|tonumber),demoWorker:(.services["demo-worker"].ports[0].published|tonumber),web:(.services.web.ports[0].published|tonumber),prometheus:(.services.prometheus.ports[0].published|tonumber),grafana:(.services.grafana.ports[0].published|tonumber)}' <<< "$config")"
for spec in 'control-plane 8080 controlPlane' 'demo-api 8081 demoApi' 'demo-worker 8082 demoWorker' 'web 8080 web' 'prometheus 9090 prometheus' 'grafana 3000 grafana'; do
  read -r service internal key <<< "$spec"
  [[ -n "$(docker compose ps -q "$service")" ]] || continue
  actual="$(docker compose port "$service" "$internal")"
  expected="$(jq -r --arg key "$key" '.[$key]' <<< "$host_ports")"
  [[ "$actual" == "127.0.0.1:$expected" ]] || fail "Running $service port differs from the selected Compose configuration."
done
for service in control-plane demo-api demo-worker; do
  expected=true; [[ "$profile" == observability ]] && expected=false
  jq -e --arg s "$service" --arg setting "OTEL_SDK_DISABLED=$expected" '.[] | select(.Config.Labels["com.docker.compose.service"] == $s) | .Config.Env | index($setting) != null' <<< "$containers" >/dev/null || fail 'App telemetry profiles differ; reapply the chosen profile.'
done
runtime="$(curl --fail --silent --show-error --max-time 10 "http://127.0.0.1:$port/api/runtime")" || fail 'Runtime identity endpoint unavailable; update the matching local stack before using the new runner.'
lab="$(jq -r '.Config.Hostname' <<< "$cp")"
jq -e --arg id "$lab" --arg profile "$profile" --argjson ports "$host_ports" '.instanceId == $id and .profile == $profile and .hostPorts == $ports and .workloadTarget == "http://demo-api:8081"' <<< "$runtime" >/dev/null || fail 'The responding control-plane identity/configuration does not match this Compose stack.'
memory="$(jq -c 'map({key:.Config.Labels["com.docker.compose.service"],value:(.HostConfig.Memory / 1048576 | floor)}) | from_entries' <<< "$containers")"
images="$(jq -cS 'map({key:.Config.Labels["com.docker.compose.service"],value:.Image}) | from_entries' <<< "$containers")"
fingerprint="$(jq -ncS --argjson memory "$memory" --argjson ports "$host_ports" --argjson images "$images" --arg profile "$profile" '{memory:$memory,ports:$ports,images:$images,profile:$profile}')"
profile_hash="$(printf '%s' "$fingerprint" | sha256sum)"; profile_hash="${profile_hash%% *}"
label="${PC_LABEL:-}"; ((${#label} <= 120)) || fail 'PC_LABEL must be at most 120 characters.'
jq -nc --arg hash "$profile_hash" --arg lab "$lab" --arg profile "$profile" --arg pc "$label" --arg url "http://127.0.0.1:$port" --argjson ports "$host_ports" --argjson memory "$memory" '{configurationHash:$hash,labInstanceId:$lab,profile:$profile,pcLabel:$pc,controlTarget:$url,workloadTarget:"http://demo-api:8081",hostPorts:$ports,memoryLimitsMiB:$memory}'
