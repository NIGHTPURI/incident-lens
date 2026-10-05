# Preserved local main deployment — 2026-10-06

This supersedes the image/Prometheus limits in the [initial recovery record](LOCAL_BACKEND_RECOVERY_20261006.md). The checkout was clean before fast-forwarding its existing branch to remote main **`0758bce8a0c22fba2a91cdce5366517ef24b1f6b`**. No clone/worktree, host runtime installation, Windows reserved-port change, volume deletion or paid RCA provider call occurred.

## Before → after

| Component | Before | After |
| --- | --- | --- |
| control-plane | Container `92f67ea56e7a`, image `8f5cf5358d15` | Container `6d7b2981a3f2`, main image `8095082fb231`; tag `incidentlens-control-plane:main-0758bce`, port `8080` |
| Docker web | Container `3efe55c8728a`, image `7237172c9b0e`; earlier curriculum | Container `e394b1b3f244`, main image `117ca52b9a4a`; tag `incidentlens-web:main-0758bce`, completed curriculum on `13000` |
| demo-api / demo-worker | Healthy, ports `8081` / `8082` | Retained same container/image IDs: normalized classes, resources and dependencies exactly match main build |
| Prometheus | Container `f1971c827c3d`, stopped; Windows reserves `9090` | Container `8f8575c4c0cb`, same Prometheus 3.5.0 image and TSDB volume, bound to **`127.0.0.1:13090` → `9090`** |
| Grafana | Container `376dee4aba8a`, port `13001` | Same container and DB; datasource remains **`http://prometheus:9090`** inside Docker |
| MySQL / Redis / Kafka | Original healthy containers and storage | IDs/configuration retained; no dependency rebuild/recreation |

Only **two app images** needed rebuilding. The backend comparison normalizes nested common-JAR ZIP metadata, then compares actual class/resource/dependency contents; demo-api/worker differences were zero. Images use new tags and `org.opencontainers.image.revision=0758bce…`; old image tags were not overwritten. The running control-plane JAR contents were compared again against the main build and matched exactly. This follow-up's repository changes only add configurable Prometheus host-port support and documentation; application source remains the deployed main version.

Original control-plane, web and Prometheus containers are **stopped and retained**, named with suffix `-preserved-0758bce`. Original containers were disconnected from the runtime network so their service aliases cannot compete with replacements. All **19 original container IDs** remain; three replacements make **22 containers**. All **14 original volume names** remain and no volumes were created or removed. The independent `incidentlens-rca-20261003` stack was untouched.

## Backups and commands actually executed

Ignored, private `.local/deployment/20261006-main/` holds:

- `mysql-before.sql`: **5,472,783 bytes**, all three service DBs, consistent logical snapshot; credentials are not printed/committed.
- `original-inspect.json`: original immutable IDs, complete container configuration, networking, environment and mounts; mode 0600 because it contains credentials.
- Original JARs, new runtime JAR, **59 MiB Prometheus TSDB copy**, row snapshots, build/deployment/rollback logs, browser screenshots and verification JSON.
- `manage.py`: guarded deployment/rollback tool using these exact private snapshots. It deletes no containers, images, networks or volumes.

```bash
git fetch origin
git merge --ff-only origin/main
./gradlew :apps:control-plane:bootJar :apps:demo-api:bootJar :apps:demo-worker:bootJar --no-daemon --max-workers=2
docker build --label org.opencontainers.image.revision=0758bce8a0c22fba2a91cdce5366517ef24b1f6b --label org.opencontainers.image.source=https://github.com/NIGHTPURI/incident-lens --build-arg APP=control-plane -t incidentlens-control-plane:main-0758bce -f infra/Dockerfile.backend .
docker build --label org.opencontainers.image.revision=0758bce8a0c22fba2a91cdce5366517ef24b1f6b --label org.opencontainers.image.source=https://github.com/NIGHTPURI/incident-lens -t incidentlens-web:main-0758bce -f apps/web/Dockerfile apps/web
python3 .local/deployment/20261006-main/verify.py snapshot
python3 .local/deployment/20261006-main/manage.py deploy
python3 .local/deployment/20261006-main/verify.py rca
python3 .local/deployment/20261006-main/verify.py prometheus
node .local/deployment/20261006-main/live-web.mjs
node .local/deployment/20261006-main/grafana-browser.mjs
python3 .local/deployment/20261006-main/manage.py rollback-apps
python3 .local/deployment/20261006-main/verify.py preserved
python3 .local/deployment/20261006-main/manage.py reapply-apps
```

Both image builds succeeded. Local `13090` had no listener in WSL/Windows and was outside the read-only Windows excluded-port ranges. `.env` did not exist in this checkout; an ignored, mode-0600 `.env` containing only `PROMETHEUS_PORT=13090` was created. Existing container environments/credentials and actual web/Grafana ports were cloned unchanged. Compose now supports `${PROMETHEUS_PORT:-9090}`; the observability verifier reads the same setting. Configuration checks passed for default `9090` and alternative `13090` with loopback binding and internal target `9090` unchanged.

## Actual deployed verification

The running control-plane and actual MySQL were used, with no mocks/H2 substitute. Five new sessions and **1,010 synthetic evidence rows** are clearly labelled deployment fixtures, not measured workload:

1. **2 BEFORE + 501 AFTER:** ordinary detail initially exposes 500 AFTER rows; new RCA cites both BEFORE rows. Saved/reloaded detail includes 500 AFTER + the two restored BEFORE citations.
2. **501 BEFORE:** oldest high-latency row is excluded by the latest-500 limit; the newest request row is cited and the excluded row cannot influence the hypothesis.
3. **Foreign session:** later timestamps/high latency in another session never enter the target's RCA or citations.
4. **Empty BEFORE:** AFTER-only session saves/reloads a rule-based report with no citations and confidence 0.
5. **Tied timestamps:** ascending ID determines the first row and citation consistently.

All five reports persisted/reloaded identically and every citation resolved to its own session's BEFORE evidence. No fault or workload was enabled for these fixtures. Existing **every DB row**, including products, orders, events, reports, sessions, activations and locks, matched the pre-deployment snapshot; new fixture data is retained. Before: 12 sessions/718 evidence/10 reports; after: **17 sessions/1,728 evidence/15 reports**. Orders/fulfillments remain **1,751**, products/details **10,000 each**. Earlier DB backups and Go/uncommitted-work archives remain untouched.

Prometheus readiness on `13090`, **all three scrape targets UP**, Grafana datasource health **OK**, Grafana-proxied `up` values **1/1/1**, positive business-request counter and provisioned **13-panel** dashboard passed. Actual Chromium logged into Grafana and observed dashboard datasource queries returning HTTP 200; the screenshot was inspected. Some event/error panels show no data when no corresponding events exist; that is not interpreted as a successful workload. No k6 benchmark or full new distributed-trace experiment is claimed.

Actual Chromium on **Docker web `13000`**, not Vite, displayed the saved learning RCA and retained the correct detail/comparison session across reload/history, separate free-lab selection and dark mode, with **zero implicit API writes**.

The app rollback was **actually executed**: original container IDs/images returned, both became healthy and readiness returned HTTP 200. Existing DB rows stayed identical. The same new containers/images were then reapplied; Prometheus/Grafana/storage remained intact throughout. Final deployed verification was repeated against that reapplied state.

## Rollback without deleting data

From this same checkout, recommended **app-only rollback** keeps working monitoring on `13090`:

```bash
python3 .local/deployment/20261006-main/manage.py rollback-apps
python3 .local/deployment/20261006-main/manage.py status
# Restore the tested main containers again:
python3 .local/deployment/20261006-main/manage.py reapply-apps
```

The tool stops and retains updated apps as `*-updated-0758bce`, restores original names/network aliases and starts original containers. It changes no DB contents. Returning to the old app version also returns the old RCA boundary bug and earlier web curriculum; this is a version rollback, not a repair.

For the **entire pre-deployment state**, `manage.py rollback-all` additionally restores the old Prometheus container **stopped** with its original `9090` binding; Windows still reserves that port. Do not expect monitoring to remain available in that state. To restore the original absence of `.env` while retaining the new file, move it to an unused backup filename under `.local/deployment/20261006-main/`; do not replace an existing backup. Reapplying apps does not reapply Prometheus after `rollback-all`; use the stored configuration for a separately reviewed full redeployment.

Do not restore SQL over the current DB merely to roll back images. New fixture/session data should stay. Prometheus uses its original retention policy; its pre-start TSDB copy is retained separately. A disaster restore should first preserve current data and restore into separate storage, rather than overwrite the current volumes.

**While archived containers exist, do not run generic Compose `up/down` or a cleanup command on this workspace.** Archived original containers retain their Compose service labels; Compose may select/delete them. Use the guarded tool or targeted `docker start/stop/restart` on the named live containers, and keep `.local/deployment/20261006-main/` and the original containers/images for rollback.

## Current entry points

- Completed Docker learning/free lab: **http://127.0.0.1:13000**. Choose learning → existing experiment records or free lab; saved data remains available.
- Control readiness: **http://127.0.0.1:8080/actuator/health/readiness**.
- Prometheus: **http://127.0.0.1:13090**; check Status → Targets.
- Grafana: **http://127.0.0.1:13001/d/incidentlens**; credentials are unchanged from the existing container/DB.
- Vite `5173` is optional; Docker web now includes the completed curriculum.
