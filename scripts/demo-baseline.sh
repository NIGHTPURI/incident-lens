#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
vus="${VUS:-2}"; duration="${DURATION_SECONDS:-10}"
[[ "$vus" =~ ^[0-9]+$ && "$duration" =~ ^[0-9]+$ ]] && ((vus >= 1 && vus <= 50 && duration >= 5 && duration <= 300)) || { echo 'Workload bounds: 1–50 VUs, 5–300 seconds.' >&2; exit 1; }
configuration="$(bash scripts/local-target.sh)"
mkdir -p artifacts
run_id="baseline-$(date +%s)-$RANDOM-$RANDOM"
printf '%s\n' "$configuration" > "artifacts/$run_id.configuration.json"
docker compose run --rm -e "VUS=${VUS:-2}" -e "DURATION_SECONDS=${DURATION_SECONDS:-10}" -e "RUN_ID=$run_id" -e "SUMMARY_PATH=/results/$run_id.json" k6 run /scripts/baseline.js
