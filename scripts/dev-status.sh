#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose ps
for spec in 'web 8080 /' 'control-plane 8080 /actuator/health' 'demo-api 8081 /actuator/health' 'demo-worker 8082 /actuator/health'; do
  read -r service internal path <<< "$spec"
  binding="$(docker compose port "$service" "$internal")"
  url="http://127.0.0.1:${binding##*:}"
  printf '%s: %s\n' "$service" "$url"
  curl --fail --silent --show-error --max-time 10 "$url$path" >/dev/null
done
