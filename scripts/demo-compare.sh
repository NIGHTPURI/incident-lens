#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for tool in curl jq docker; do command -v "$tool" >/dev/null || { echo "Required tool missing: $tool" >&2; exit 1; }; done
scenario="${SCENARIO:-DOWNSTREAM_LATENCY}"
parameter="${PARAMETER:-400}"
vus="${VUS:-2}"
duration="${DURATION_SECONDS:-10}"
recovery="${RECOVERY_SECONDS:-5}"
idle_timeout="${IDLE_TIMEOUT_SECONDS:-300}"
configuration="$(bash scripts/local-target.sh)"
control_url="$(jq -r .controlTarget <<< "$configuration")"
session_id=''
experiment_id=''
fault_active=false
run_active=false
while (($#)); do
  case "$1" in
    --session-id) session_id="${2:?Missing session ID}"; shift 2 ;;
    --experiment-id) experiment_id="${2:?Missing experiment ID}"; shift 2 ;;
    --scenario) scenario="${2:?Missing scenario}"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done
case "$scenario" in DOWNSTREAM_LATENCY|DATABASE_DEGRADATION|KAFKA_SLOWDOWN|CACHE_DEGRADATION) ;; *) echo 'Invalid scenario' >&2; exit 1 ;; esac
for number in "$parameter" "$vus" "$duration" "$recovery" "$idle_timeout"; do [[ "$number" =~ ^[0-9]+$ ]] || { echo 'Numeric settings must be non-negative integers' >&2; exit 1; }; done
((parameter <= 2000 && vus >= 1 && vus <= 50 && duration >= 5 && duration <= 300 && recovery <= 120 && idle_timeout >= 5 && idle_timeout <= 900)) || { echo 'Settings exceed supported bounds' >&2; exit 1; }
if [[ -n "$session_id" && -z "$experiment_id" || -z "$session_id" && -n "$experiment_id" ]]; then echo 'Supply both session ID and experiment ID' >&2; exit 1; fi

control() {
  local method="$1" path="$2"
  if (($# == 3)); then curl --fail-with-body --silent --show-error --max-time 60 -X "$method" "$control_url$path" -H 'Content-Type: application/json' --data "$3"
  else curl --fail-with-body --silent --show-error --max-time 60 -X "$method" "$control_url$path"; fi
}
cleanup() {
  if [[ ( "$fault_active" == true || "$run_active" == true ) && -n "$session_id" ]]; then
    verified="$(bash scripts/local-target.sh)" || { echo 'Cleanup target could not be verified; manually check this session in its original local lab.' >&2; return; }
    [[ "$(jq -r .labInstanceId <<< "$verified")" == "$(jq -r .labInstanceId <<< "$configuration")" ]] || { echo 'Cleanup instance changed; manually check the original session.' >&2; return; }
    control PUT "/api/sessions/$session_id/fault" '{"enabled":false,"parameter":0}' >/dev/null || echo "Could not disable fault; manually disable session $session_id in the UI" >&2
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
mkdir -p artifacts
if [[ -n "$session_id" ]]; then
  experiment="$(control GET "/api/experiments/$experiment_id")"
  [[ "$(jq -r '.sessionId' <<< "$experiment")" == "$session_id" ]] || { echo 'Experiment/session mismatch' >&2; exit 1; }
  [[ "$(jq -r '.status' <<< "$experiment")" == 'CREATED' ]] || { echo 'Only a fresh CREATED experiment can be run; create a new session after an interrupted/completed run' >&2; exit 1; }
  vus="$(jq -er '.workload.vus' <<< "$experiment")"
  duration="$(jq -er '.workload.durationSeconds' <<< "$experiment")"
fi

deadline=$((SECONDS + idle_timeout))
idle_observations=0
echo 'Waiting for three idle observations: outbox pending=0 and Kafka lag=0.'
while ((SECONDS < deadline)); do
  remaining=$((deadline - SECONDS))
  ((remaining > 10)) && remaining=10
  overview="$(curl --fail-with-body --silent --show-error --max-time "$remaining" "$control_url/api/overview")"
  jq -e '.services | length > 0 and all(.[]; .status == "UP")' <<< "$overview" >/dev/null || { echo 'The lab reports an unavailable service; restore health before comparing.' >&2; exit 1; }
  jq -e '.services | map(.name) | index("demo-api") != null and index("demo-worker") != null' <<< "$overview" >/dev/null || { echo 'Missing healthy demo API/worker telemetry; refusing an unverified baseline.' >&2; exit 1; }
  jq -e '[.metrics.outboxPending,.metrics.kafkaLag] | all(.[]; type == "number" and . >= 0)' <<< "$overview" >/dev/null || { echo 'Outbox or Kafka lag is unavailable/invalid; missing telemetry cannot prove an idle lab.' >&2; exit 1; }
  if jq -e '.metrics.outboxPending == 0 and .metrics.kafkaLag == 0' <<< "$overview" >/dev/null; then
    idle_observations=$((idle_observations + 1))
  else idle_observations=0; fi
  ((idle_observations == 3)) && break
  jq -r '"Preflight: outbox=\(.metrics.outboxPending), Kafka lag=\(.metrics.kafkaLag)."' <<< "$overview"
  sleep 2
done
((idle_observations == 3)) || { echo "The lab did not drain within $idle_timeout seconds. No new fault/run was started. Inspect backlog or increase IDLE_TIMEOUT_SECONDS." >&2; exit 1; }
verified="$(bash scripts/local-target.sh)"
[[ "$verified" == "$configuration" ]] || { echo 'Local configuration changed during preflight; no new fault was started.' >&2; exit 1; }
if [[ -z "$session_id" ]]; then
  session_id="$(control POST /api/sessions "$(jq -nc --arg scenario "$scenario" '{name: ($scenario + " comparison"), scenario: $scenario}')" | jq -er '.id')"
  experiment_id="$(control POST "/api/sessions/$session_id/experiments" "$(jq -nc --argjson vus "$vus" --argjson duration "$duration" '{vus: $vus, durationSeconds: $duration}')" | jq -er '.id')"
fi

run_phase() {
  local phase="$1" summary="artifacts/$experiment_id-$1.json"
  run_active=true
  verified="$(bash scripts/local-target.sh)"
  [[ "$verified" == "$configuration" ]] || { echo 'Lab configuration changed during the comparison; refusing mismatched load.' >&2; exit 1; }
  control POST "/api/experiments/$experiment_id/runs" "$(jq -nc --arg phase "$phase" --argjson configuration "$configuration" '{phase:$phase,configuration:$configuration}')" >/dev/null
  docker compose run --rm -e "SESSION_ID=$session_id" -e "RUN_ID=$experiment_id" -e "PHASE=$phase" -e "VUS=$vus" -e "DURATION_SECONDS=$duration" -e "SUMMARY_PATH=/results/$experiment_id-$phase.json" k6 run /scripts/baseline.js
  jq -e '.requestCount > 0' "$summary" >/dev/null
  curl --fail-with-body --silent --show-error --max-time 60 -X POST "$control_url/api/experiments/$experiment_id/runs/$phase/complete" -H 'Content-Type: application/json' --data-binary "@$summary" >/dev/null
  run_active=false
}
fault_active=true
control PUT "/api/sessions/$session_id/fault" "{\"enabled\":true,\"parameter\":$parameter}" >/dev/null
run_phase BEFORE
control POST "/api/sessions/$session_id/rca" >/dev/null
control PUT "/api/sessions/$session_id/fault" '{"enabled":false,"parameter":0}' >/dev/null
fault_active=false
sleep "$recovery"
run_phase AFTER
echo "Session: $session_id | Experiment: $experiment_id"
control GET "/api/experiments/$experiment_id" | jq .
web_binding="$(docker compose port web 8080 2>/dev/null || true)"
if [[ -n "$web_binding" ]]; then echo "Open http://localhost:${web_binding##*:} and select the session. Measured summaries are in artifacts/."
else echo 'Open the dashboard at WEB_PORT configured in .env. Measured summaries are in artifacts/.'; fi
