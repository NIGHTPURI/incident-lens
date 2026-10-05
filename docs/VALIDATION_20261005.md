# IncidentLens verification — 2026-10-05

## Scope and preservation

Work continued in `/home/mireu/Dev/incident-lens-career-20261002`, on `feat/learning-os-selector`; no new clone/worktree. Initial HEAD was `7aa36b5`, with nine tracked modifications and 49 untracked files. After an actual fetch, origin/main was `2874671` (PR #3 already merged); the branch had one additional local learning commit. No AGENTS.md was found in this checkout or the applicable parent locations. Existing source/document/CI instructions and manifests were read.

Initial status, binary tracked diff and **all initial untracked files** are preserved in ignored `.local/preservation/20261005/` (`incidentlens-initial-status.txt`, `incidentlens-initial.patch`, `incidentlens-untracked-20261005.tar.gz`), with duplicate originals in `/tmp`. This includes the removed language's unique local content. No reset, clean, stash deletion, overwritten user work or force push occurred. Original branches and preservation files remain.

Docker Desktop server 4.85.0 / Engine 29.6.2 was actually reached from WSL after execution approval. The sandbox initially denied Docker socket access and external worktree Git metadata writes; approved commands ran with the required scope. Socket ownership, groups and security settings were not changed. Existing `incidentlens-*` / `incidentlens-rca-20261003-*` application containers and named MySQL/Kafka/observability volumes were not used, removed or modified by verification. Testcontainers used fresh tmpfs MySQL and temporary Redis/Kafka; task-created language containers used isolated `/tmp` DBs and were removed on exit. No existing DB/session/fault was changed.

## Executed checks

| Category | Actual command / execution | Result |
| --- | --- | --- |
| Backend build + fresh infrastructure | `./gradlew build integrationTest --rerun-tasks --max-workers=2 --no-daemon` | BUILD SUCCESSFUL, **28/28 tasks executed**, 12m24s; unit **81**, integration **18**; failures/errors/skipped **0** |
| H2 RCA boundary | `RcaPhaseLimitTest`, normal Gradle test suite | 3 contracts: 2 BEFORE+501 AFTER, 501 BEFORE limit/session/tie ordering, empty BEFORE; saved/reloaded/citation-restored reports |
| Actual MySQL RCA boundary | `RcaPhaseLimitMySqlIntegrationTest`, Gradle integrationTest | Same 3 inherited contracts against `mysql:8.4.6` + real Flyway migration; no LLM calls |
| Other actual infrastructure | `OrderOutboxIntegrationTest`, `WorkerIntegrationTest`, `ControlPlaneMySqlIntegrationTest` | MySQL/Redis/Kafka contracts included in 18 integration tests; not SQLite/H2 substitutes |
| Web units | `cd apps/web && npm test -- --run --maxWorkers=2` | **55 passed**, 10 files; no failures |
| Web types/build | `cd apps/web && npm run build` (tsc -b + Vite) | Success; bundle size warning remains (~746 kB uncompressed JS) |
| Full Chromium suite | `CI=1 npm run test:browser -- --workers=2` | 81 cases across desktop/laptop/mobile: 78 passed; 3 new cases failed on an incorrect label selector |
| Corrected browser cases | `CI=1 npm run test:browser -- e2e/learning-isolation.spec.ts --workers=2` | **6 passed**; includes all 3 corrected cases. All 81 distinct cases have passed; the single final full-suite CI run is tracked in the PR |
| Live preview browser inspection | Actual Chromium opened `http://127.0.0.1:5173`; English desktop 1440×900 and Korean mobile 390×844, dark Python persistence lesson | Both contained within viewport width; zero non-GET API requests. PNGs inspected in `.local/verification/20261005/` |
| Java introductory exercises | `python3 examples/beginner/verify.py` | Passed real source/HTTP checks |
| Java advanced exercises | `python3 examples/beginner/advanced/run.py all` | 11 isolated stage programs passed; H2/thread/cache/broker models clearly labelled |
| Java Spring/JPA examples | `./gradlew -p examples/beginner/spring-api --offline --no-daemon test`; same for `data-jpa` | BUILD SUCCESSFUL; isolated example tests |
| Python intro | `python3 -m unittest discover -s examples/language-paths/python -v`; `python3 examples/language-paths/verify_intro.py python` | 1 unit plus actual HTTP 200/201/400/404/409 passed |
| Python advanced | In fresh Python 3.12.12 container: pip install from `requirements.lock`, `python -m unittest -v` | **4 passed**: real FastAPI/SQLite owner, rollback, replay/reopen/worker, TTL checks |
| Python process recovery | With locked dependencies: `python ../verify_recovery.py python` | Actual HTTP 401/403, replay/409, **8 parallel requests→one order**, API restart, pending recovery, worker restart, request/order/event correlation and graceful shutdown passed |
| JS intro | `npm install --package-lock-only --ignore-scripts`; `npm test`; `python3 examples/language-paths/verify_intro.py javascript` | 1 HTTP contract test plus explicit 200/201/400/404/409 requests passed |
| JS advanced | `npm ci` setup; `npm test` from advanced/javascript | **3 passed**: actual Express HTTP, SQLite rollback/replay/reopen/deferred work, local TTL |
| TypeScript execution | `npm run build` (tsc + schema), `npm run typecheck`; `python3 .../verify_recovery.py typescript` | Typed source compiled and **dist/server.mjs actually served HTTP**; same parallel/restart/worker/correlation checks passed |
| JS process recovery | `python3 examples/language-paths/advanced/verify_recovery.py javascript` | Same actual parallel/recovery boundaries passed |
| C# intro + advanced | Temporary .NET SDK 8.0.425: `dotnet build .../csharp/CatalogPractice.csproj`; `dotnet restore tests/CatalogAdvanced.Tests.csproj --locked-mode`; `dotnet test ... --no-restore` | **5 passed**, skipped 0: intro actual HTTP; store/cache/identity; advanced actual HTTP 401/403/replay/409, 8 parallel requests, API and worker restart/correlation |
| Schema up/down | `python3 -m unittest discover -s examples/language-paths/advanced -p test_migrate.py -v` | **2 passed**: preserve price/order data, reject missing DB/unexpected version |
| Diff review | `git diff --check`, staged filename/content review | No credentials, private configuration, dependency/build output, DB files or preservation archives staged |

Representative exact isolated language invocation (from the repository root):

```bash
docker run --rm --name incidentlens-python-ready-20261005 --user 1000:1000 \
  -e HOME=/tmp -v "$PWD/examples/language-paths:/practice" \
  -w /practice/advanced/python python:3.12.12-slim sh -c \
  'python -m venv /tmp/venv && /tmp/venv/bin/pip install -r requirements.lock && /tmp/venv/bin/python ../verify_recovery.py python'

docker run --rm --name incidentlens-csharp-ready-20261005 --user 1000:1000 \
  -e DOTNET_CLI_HOME=/tmp/dotnet -e NUGET_PACKAGES=/tmp/nuget \
  -v /tmp/incidentlens-nuget:/tmp/nuget -v "$PWD/examples/language-paths:/practice" \
  -w /practice/advanced/csharp mcr.microsoft.com/dotnet/sdk:8.0 sh -c \
  'dotnet restore tests/CatalogAdvanced.Tests.csproj --locked-mode && dotnet test tests/CatalogAdvanced.Tests.csproj --no-restore'
```

Image digests used: Python `sha256:f3fa41d74a768c2fce8016b98c191ae8c1bacd8f1152870a3f9f87d350920b7c`; .NET SDK `sha256:78235e09001f52b6592c458ac010775ebac6725422e80cd0c1650590f67b2743`. Host runtimes/security settings were not installed or changed. npm dependencies are local to the example project; Python/NuGet dependencies were prepared in temporary containers. `/tmp/incidentlens-*20261005.log` contains actual run logs; ignored `.local/verification/20261005` retains the final evidence.

## Failures resolved during verification

- Initial web test exceeded its 5s timeout under parallel build/image load; limiting to two workers passed. No timeout-only production code change.
- Overlapping browser invocations reused a server that exited with the first invocation. Final full/focused runs used independent `CI=1` servers sequentially.
- Route persistence invalidated an old localization test assumption that refresh always returned to overview; the test now explicitly chooses overview before refreshing.
- The new browser isolation test used an exact label locator containing nested option text. `.learning-controls select` verifies the actual displayed session correctly.
- JS store was closed twice by its reopen test; close is now safe when already closed.
- C# Web SDK included nested test output as content; `DefaultItemExcludes` excludes tests from the app. The slim SDK lacks the external kill binary; the owned-child test sends SIGTERM via libc. Server readiness waits up to 60s in the isolated environment.
- The Python worker restart test could send SIGTERM before its handler had initialized. Workers emit `worker_ready`; the verifier waits for readiness before stopping them. This readiness is tested in actual processes.
- Uvicorn 0.34.2 re-raises a received signal after completing shutdown. The verifier requires `Application shutdown complete.` before accepting its SIGTERM return. [Upstream implementation](https://github.com/encode/uvicorn/blob/0.34.2/uvicorn/server.py).

## Boundaries and current local use

Browser regression uses explicit API fixtures/offline routing; this proves UI behavior, not live infrastructure. The separate live preview capture used actual GET-only browser requests, and backend HTTP/storage contracts were separately verified against actual MySQL. A complete live browser fault experiment on the user's existing DB was not run, preserving that DB and its fault/session state.

Local learning preview is running at `http://127.0.0.1:5173` (HTTP 200 verified). A read-only health request to the preserved existing backend `:8080` returned HTTP 000; it is currently unreachable. Its default API proxy is the existing `http://127.0.0.1:8080`; existing Docker images/infrastructure were preserved rather than redeployed. Lessons and progress work offline. Free-lab execution requires healthy services and explicit experiment controls. No production deploy or paid LLM/provider request occurred.

Native Windows toolchain execution, production rollout/TLS, verified signed login identities, price-edit cache invalidation and unbounded multi-replica SQLite contention are not claimed. Python/JS/C# use SQLite, process cache and polling; actual Redis/Kafka integration is verified **only for the Java fault lab**. Optional Prometheus/Grafana/Loki/Tempo/OTel are source/Compose mapped; this session did not start or revalidate their complete telemetry pipeline.

## GitHub delivery

RCA commit: `3e8fa97`. Existing local learning commit `7aa36b5` retained. Learning completion commit, draft→ready PR, main merge and post-merge CI are linked in the final delivery report. CI includes existing backend/web/Compose gates and new locked language-example jobs; protection rules are respected.
