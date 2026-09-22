#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for file in README.md ARCHITECTURE.md SESSION_STATE.md docker-compose.yml .env.example gradle/wrapper/gradle-wrapper.jar apps/web/package-lock.json docs/INTERVIEW_GUIDE.md docs/PROJECT_STORY.md docs/AI_ENGINEERING.md docs/AWS_DEPLOYMENT.md; do
  [[ -f "$file" ]] || { echo "Required file missing: $file" >&2; exit 1; }
done
./gradlew build --no-daemon
if [[ "${1:-}" == '--integration' ]]; then ./gradlew integrationTest --no-daemon; fi
npm --prefix apps/web ci
npm --prefix apps/web test -- --run
npm --prefix apps/web run build
docker compose --profile observability --profile loadtest config --quiet
echo 'Verification passed. Use --integration to run tests requiring a Docker daemon.'
