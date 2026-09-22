#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
[[ -f .env ]] || cp .env.example .env
mkdir -p artifacts
if [[ "${1:-}" == '--observability' ]]; then
  OTEL_SDK_DISABLED=false docker compose --profile observability up --build -d --wait --wait-timeout 600
else
  OTEL_SDK_DISABLED=true docker compose up --build -d --wait --wait-timeout 600
fi
web_binding="$(docker compose port web 8080)"
echo "IncidentLens: http://localhost:${web_binding##*:} | API docs: http://localhost:8080/swagger-ui/index.html"
