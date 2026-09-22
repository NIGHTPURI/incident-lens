#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p artifacts
run_id="baseline-$(date +%s)"
docker compose run --rm -e "VUS=${VUS:-5}" -e "DURATION_SECONDS=${DURATION_SECONDS:-20}" -e "RUN_ID=$run_id" -e "SUMMARY_PATH=/results/$run_id.json" k6 run /scripts/baseline.js
