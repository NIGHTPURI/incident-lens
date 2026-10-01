# Docker web build diagnostics

The warmed baseline builds do **not** reproduce the reported 218-second build command. Native compilation took 4.48–5.11 seconds; the same locked source and Node version took 5.27–6.12 seconds in an ordinary Alpine container and 5.57–5.63 seconds inside BuildKit. No Dockerfile, dependency, Vite or daemon setting was changed as a claimed performance fix.

There is a concrete storage difference: Ubuntu and the repository use an NVMe-backed WSL disk, while the active Docker Desktop image disk is on a separate SATA HDD. A small durable-write probe was substantially slower through Docker's overlay filesystem. That makes cold layer access, snapshot/export work and storage contention credible contributors. It does not prove the cause of every second in the original run, whose plain log was not available.

## Scope and evidence

Measurements were executed on 2026-09-22 against commit `be795add753bbe06b3bef96510b7ffd3273428a3`. A `git archive` snapshot was taken before subsequent UI edits. Native and container builds used Node **22.23.2**, the same `package-lock.json`, TypeScript build plus Vite **7.3.6**, and produced the same baseline asset names. Diagnostic images had separate tags; running application services and persistent data were preserved. No pruning, cache flushing, volume removal, image-store switch, VM shutdown or disk migration was performed.

The initial **4.162-second native / 326-second Docker / 218-second RUN** figures are user-reported. They are not presented as independently remeasured results. Raw logs from this investigation are retained locally in ignored `artifacts/docker-build-diagnostics/`; the selected values below are the durable record in the repository.

| Executed case | Build command elapsed | Vite-reported elapsed | BuildKit RUN step | Entire Docker CLI elapsed |
| --- | ---: | ---: | ---: | ---: |
| Native WSL, first | 5.11 s | 1.26 s | — | — |
| Native WSL, second | 4.48 s | 1.47 s | — | — |
| Ordinary Node Alpine container, first | 6.12 s | 1.46 s | — | 18.58 s for both commands and container lifecycle |
| Same ordinary container, second | 5.27 s | 1.41 s | — | included above |
| Forced BuildKit command, first | 5.63 s | 1.56 s | 10.9 s | 32.23 s |
| Forced BuildKit command, second | 5.57 s | 1.37 s | 8.6 s | 28.44 s |
| Exact baseline Compose build, all layers cached | not executed | not executed | CACHED | 18.43 s |

The exact Compose build transferred **245.42 kB** of context. `npm ci`, source copy, compilation and final asset copy were all cached. Separately exporting the cached dependency stage still took **54.8 seconds** in the export step, including 46.3 seconds exporting layers. That cost occurred without reinstalling dependencies or compiling the frontend.

BuildKit was forced to rerun only the compilation stage by placing a diagnostic `ARG` after the unchanged dependency/source layers and changing that argument between runs. The temporary Dockerfile used `RUN time npm run build`, allowing the command's own timer to be compared with BuildKit's encompassing step timer. These diagnostic builds exported the build stage, whereas the exact Compose build exports the small nginx runtime image; their total times are not directly interchangeable.

These are short diagnostic samples with warm caches, not a statistically controlled capacity benchmark. No OS page cache was deliberately evicted. The ordinary container's first compilation also warmed dependency pages before the forced BuildKit measurements. Background demo services remained running; a later UI edit did not affect the archived source.

## Environment inspection

| Item | Observed state |
| --- | --- |
| Actual Windows host | Microsoft Windows 10 Pro, version 10.0.19045, build 19045 (`Win32_OperatingSystem`) |
| Docker engine / Compose / BuildKit | 29.6.2 / 5.3.1 / 0.31.2 |
| Active builder | `default`, `docker` driver, Linux Unix socket |
| Architecture | Host x86_64; container Node `x64`, Linux; no cross-platform build requested |
| WSL | 2.7.14.0; kernel 6.18.33.2-microsoft-standard-WSL2 |
| Engine resources | 8 CPUs, 8,281,260,032 bytes memory; about 7.71 GiB |
| Image storage | `overlayfs`, `io.containerd.snapshotter.v1`; containerd image store enabled |
| Repository filesystem | Linux ext4, `<repository-root>`, not `/mnt/c` (local account path redacted for publication) |
| Ubuntu WSL VHD | `E:\WSL\Ubuntu-24.04`, Samsung NVMe SSD |
| Active Docker VHD | `D:\…\DockerDesktopWSL\disk\docker_data.vhdx`, WDC WD10EZEX SATA HDD |
| Host free capacity | D: about 286 GiB; E: about 233 GiB; C: about 3 GiB / 98% used |
| Ordinary build container limits | `cpu.max = max 100000`, `memory.max = max` |

Windows 11 is the project's requested primary target. These measurements were executed on the confirmed Windows 10 host above; they do not constitute a Windows 11 performance measurement.

Drive letters were explicitly mapped with `Get-Partition`, `Get-Disk` and `Get-PhysicalDisk`; the Docker location came from the **current Windows user's** Docker settings and was confirmed by locating its VHD. An older user's settings referenced a different disk and were not treated as the active configuration. The nearly full C: drive is an independent host concern; it is not the location of this Docker image disk.

Sampled WSL pressure showed roughly 26.6% full I/O stall time over the recent ten-second window, while CPU contention was about 0.4% and memory pressure near zero at that observation. This is VM-wide evidence, not proof that BuildKit alone caused the stalls. Some swap was already allocated, which by itself does not establish active swap thrashing. The live Kafka container consumed roughly 132% of one CPU in a sample; the VM still had eight CPUs. There was no observed build OOM or forced CPU quota.

The 128 MiB `web.mem_limit` belongs to the **running nginx service**, not the Node build stage. Changing it would not address these measurements. Docker distinguishes service-container memory from build configuration, and the legacy Compose `build --memory` flag is not supported by BuildKit. [Compose services](https://docs.docker.com/reference/compose-file/services/#mem_limit), [Compose build CLI](https://docs.docker.com/reference/cli/docker/compose/build/).

An unselected `desktop-linux` context used a Windows named pipe and reported `protocol not available` from the Linux CLI. The selected `default` context and its Unix socket worked throughout; the stale context was not the builder executing these runs.

## Bounded storage check

A Node probe created 32 new 4 KiB temporary files, called `fsync` after each write, then removed only its own temporary directory. It did not touch database files or project volumes.

| Filesystem path | 32 durable writes |
| --- | ---: |
| Native Ubuntu `/tmp`, NVMe-backed VHD | 178.86 ms |
| Disposable container `/tmp`, Docker overlay on HDD-backed VHD | 3592.87 ms |

This compares two complete filesystem/storage paths, including overlay and virtualization effects. It is not a general disk-throughput benchmark, and Vite does not issue this exact sequence of `fsync` calls. It corroborates that durable layer/export work can have a much larger cost on the Docker path; it does not establish a 20-fold frontend optimization opportunity.

## Why the repository configuration was retained

The Dockerfile already copies dependency manifests before `npm ci`, then copies source. `.dockerignore` excludes host `node_modules`, generated output, screenshots and browser artifacts. The measured context is small and the expensive dependency layer is reused. Those are the relevant practices in Docker's [build-cache guidance](https://docs.docker.com/build/cache/optimize/).

An npm cache mount would help when the dependency installation layer is invalidated, but cannot remove a delay from an already cached `npm ci` step. Switching from Alpine, removing TypeScript checks, adding arbitrary Node heap limits, or splitting the bundle has no measured justification here. The ordinary Alpine builds are already close to native. BuildKit snapshot/container startup/export overhead and storage conditions deserve investigation before changing frontend code.

## Exact checks and an optional host-side remediation experiment

These are inspection instructions and a proposed **manual** comparison; migration has not been performed or validated by this project.

1. In Docker Desktop, inspect **Settings → Resources → Advanced → Disk image location**. On this host it resolves to D:, the HDD. Consider a new, empty directory on the confirmed NVMe E: drive with sufficient free space. Schedule downtime, save needed project/database data, and use Docker Desktop's supported move/apply flow. Do not manually move an open VHD, overwrite an existing Docker disk, or delete volumes to make room. Docker's WSL documentation identifies the supported location setting. [Docker Desktop WSL storage](https://docs.docker.com/desktop/features/wsl/).
2. Record the original location and configuration first. After a move, verify the same images, named volumes, database counts and healthy application services before benchmarking. If the UI offers to replace an existing disk at the destination, cancel and choose an unused destination. Docker documents that destination conflicts can offer replacement. [Desktop settings](https://docs.docker.com/desktop/settings-and-maintenance/settings/#advanced).
3. Repeat the same locked-source native, ordinary-container and forced-BuildKit commands. Record both first and repeated runs, including metadata resolution, source transfer, command timer, RUN duration and image export. A move is only a demonstrated remedy after these comparable measurements; no post-migration result exists yet.
4. Inspect **Settings → Resources → WSL Integration** for Ubuntu-24.04 and **Settings → General** for the WSL engine and containerd store. Both the selected Linux backend and containerd store worked here. Do not toggle image stores as a blind performance fix: Docker keeps separate stores and hides the inactive store's containers/images until switched back. [Containerd image-store behavior](https://docs.docker.com/desktop/features/containerd/).
5. Inspect `%UserProfile%\.wslconfig` or WSL Settings for memory, processors, swap and `autoMemoryReclaim`. No explicit `.wslconfig` override was found for the current user. WSL controls these resources in WSL2 mode; the observed warm runs do not justify increasing limits or disabling memory reclamation. Source code should remain in Linux ext4, as it already does here. [Microsoft WSL settings](https://learn.microsoft.com/windows/wsl/wsl-config), [Docker WSL filesystem guidance](https://docs.docker.com/desktop/features/wsl/best-practices/).
6. If a slow run recurs, capture Windows Task Manager/Resource Monitor disk active time and response time for D:, `docker stats`, and `/proc/pressure/{cpu,io,memory}` during that exact run. These records can distinguish disk contention, CPU contention and memory reclamation. Do not disable endpoint protection based on speculation; it was not investigated or identified as the cause.

## Reproduction commands

From the repository root, the requested plain-progress Compose build is:

```powershell
docker compose --progress plain build web
```

`--progress` is placed before `build` for the installed Compose version. For native elapsed time, run `Measure-Command { npm --prefix apps/web run build }` in PowerShell, or `time npm --prefix apps/web run build` in Bash. Inspect rather than modify the environment:

```powershell
docker version
docker compose version
docker buildx ls
docker context ls
docker info
docker stats --no-stream
wsl --version
Get-PhysicalDisk | Select-Object FriendlyName,MediaType,BusType,Size
Get-Partition -DriveLetter C,D,E | ForEach-Object {
    $disk = Get-Disk -Number $_.DiskNumber
    [pscustomobject]@{ Drive=$_.DriveLetter; Model=$disk.FriendlyName; Bus=$disk.BusType }
}
```

The controlled comparison used this temporary Dockerfile against the archived baseline:

```dockerfile
FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
FROM dependencies AS measured
COPY . .
ARG DIAGNOSTIC_NONCE
RUN time npm run build
```

Build the dependency target with a diagnostic tag, then run an ordinary container from that image, copying the archived source into `/app` before `time npm run build`. For BuildKit, use `--target measured --build-arg DIAGNOSTIC_NONCE=first`, then repeat with `second`; this forces the command while retaining the dependency cache. The measured runs used a 600-second external deadline and never used `--no-cache` or pruning. Diagnostic images remain separately tagged `incidentlens-web:diagnostic-baseline`, `incidentlens-web:diagnostic-dependencies` and `incidentlens-web:diagnostic-measured`; the running production image was not replaced by these tests.

## Outcome

Investigation identified a real NVMe-versus-HDD storage split and measurable Docker filesystem overhead. The current warmed build command is healthy at about 5.6 seconds, while the original 218-second command remains an unreproduced intermittent observation. No unsupported “326 seconds fixed to 28 seconds” claim is made: the reported slow run and the warmed diagnostic runs did not share a controlled cache/storage state. The next meaningful experiment is a deliberately scheduled Docker-disk relocation or a captured recurrence, followed by equivalent before/after measurements.

## Earlier updated-UI build verification

After the first UI changes passed 15 browser tests and their browser/Vite processes exited, that source was frozen and tested sequentially. This is a separate revision from the archived baseline, not a controlled before/after optimization result:

| Frozen-source command | Measured result |
| --- | --- |
| Native `npm run build` | 4.25 s total; Vite 1.25 s; exit 0 |
| `docker compose --progress plain build web` | 37.80 s total; `RUN npm run build` 11.5 s; Vite 1.53 s; exit 0 |
| Dependency installation | `npm ci` remained CACHED |
| Context transfer / source copy | 126.38 kB transferred in 0.0 s; COPY step 2.4 s |
| Final runtime-image export | 9.0 s total export step; 3.4 s exporting layers |

The tracked source-diff SHA-256 matched before and after both builds. Native and Docker outputs reported JavaScript asset `index-XW0WOEFf.js` and stylesheet `index-D6N4S3O6.css`. Logs are `final-native.log` and `final-compose-web.log` in the diagnostic artifact directory. The resulting image was deployed with `docker compose up -d --no-deps --wait --wait-timeout 90 web`, preserving the backend containers and stored incident data.

## Most recent build after mobile readability correction

A subsequent CSS correction placed confidence below the long mobile RCA hypothesis and improved Korean paragraph wrapping. After aggregate verification and another 15/15 browser-test pass, all browser/test processes exited and the source was held fixed for the following sequential checks:

| Most recent command | Measured result |
| --- | --- |
| Native `npm run build` | **4.31 s** total; Vite 1.36 s; exit 0 |
| `docker compose --progress plain build web` | **35.95 s** total; `RUN npm run build` **10.3 s**; Vite 1.48 s; exit 0 |
| Dependency installation | `npm ci` remained CACHED |
| Context / runtime-image export | 36.06 kB transferred; 8.9 s export step, including 3.6 s exporting layers |

The source-diff SHA-256 was unchanged across the Docker build. Native and Docker outputs matched `index-BuPVkcz5.js` and `index-HrxRb2yW.css`. The latest logs are `css-final-native.log`, `css-final-compose-web.log` and `css-final-web-deploy.log`. Web-only deployment used the same `--no-deps --wait` command, keeping backend containers and incident data intact. The earlier **37.80 s** run remains above as a separate historical UI build; neither run is evidence of a Docker configuration optimization, because the configuration was unchanged.
