# PC별 로컬 실행 안내 / Local PC setup

이 문서는 IncidentLens 자체 로컬 실험실의 안내입니다. 임의의 앱 자동 분석이나 원격 장애 실험은 제공하지 않습니다. 브라우저 선택은 준비안이며 `.env`나 Docker가 변경된 것이 아닙니다. English overview: [README.en.md](../README.en.md#pc-specific-execution-setup).

## 세 가지 사용 방식

| 방식 | 실행 명령 | 서비스 / 제한 |
|---|---|---|
| 학습만 | `cd apps/web`, `npm ci`, `npm run dev -- --host 127.0.0.1 --port 5173 --mode learning` | Docker 불필요. 실험 API 프록시 차단. 네 언어 수업·기술 사전·브라우저 기록만 사용 |
| 기본 실험실 | `bash scripts/dev-up.sh` / `./scripts/dev-up.ps1` | 기본 7개. Java/Spring 장애 제어, 내장 계측, 무료 규칙 RCA. k6는 터미널에서 명시적으로 실행 |
| 관측 포함 | `bash scripts/dev-up.sh --observability` / `./scripts/dev-up.ps1 -Observability` | 기본 7개 + Prometheus, Grafana, Loki, Tempo, Collector. 상세 지표·로그·분산 추적 |

학습만 모드는 기존 컨테이너를 종료하지 않습니다. 관측 모드에서 기본 모드로 바꿔도 관측 컨테이너를 자동 삭제하지 않습니다. 필요하면 사용자가 `docker compose --profile observability stop prometheus grafana loki tempo otel-collector`로 다섯 개만 중지합니다. 설치·관리자/보안 설정 변경이나 Docker 재시작 전에 기존 서비스에 미치는 영향을 확인하세요.

## 먼저 확인할 명령

Linux / WSL Bash:

```bash
uname -a
cat /etc/os-release
git --version
docker version
docker compose version
docker info
docker system df
ss -ltn
free -h
df -h
```

Windows PowerShell:

```powershell
wsl.exe --list --verbose
git --version
docker version
docker compose version
docker info
docker system df
Get-NetTCPConnection -State Listen | Select-Object LocalAddress,LocalPort
netsh interface ipv4 show excludedportrange protocol=tcp
Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize,FreePhysicalMemory
Get-PSDrive -PSProvider FileSystem
```

Windows의 PC RAM과 Docker Desktop에 배정된 RAM은 다릅니다. WSL 내부의 `free -h`도 Windows 전체 메모리를 대신하지 않습니다. Docker Desktop Settings에서 자원과 현재 배포판 WSL Integration을 직접 확인하세요. 브라우저의 API 연결 상태는 Docker 준비·포트 여유·자원 보장의 증거가 아닙니다.

PowerShell 파일 실행이 실행 정책으로 차단되면 권한·정책을 먼저 확인합니다. 이 도구는 정책을 자동 변경하거나 우회하지 않습니다. Windows npm 명령은 필요하면 `npm.cmd`로 실행하세요. Bash 비교 실행기는 `curl`, `jq`, Docker가 필요하며 없는 도구는 확인 후 설치합니다.

## 호스트 포트와 내부 포트

`.env.example`의 `CONTROL_PLANE_PORT=8080`, `DEMO_API_PORT=8081`, `DEMO_WORKER_PORT=8082`, `WEB_PORT=3000`, `PROMETHEUS_PORT=9090`, `GRAFANA_PORT=3001`은 호스트 포트입니다. 컨테이너 내부는 각각 8080, 8081, 8082, 8080, 9090, 3000으로 고정합니다. 모든 바인딩은 `127.0.0.1`이며 내부 DB·Redis·Kafka는 호스트에 공개하지 않습니다.

기존 `.env`는 덮어쓰지 않습니다. 충돌이나 Windows 예약 포트가 있으면 1–65535 범위의 서로 다른 비어 있는 포트를 선택하세요. 예제 값 자체가 비어 있다는 보장은 없습니다. `.env`·프로필 변경은 `dev-up`으로 관련 컨테이너를 재생성해야 적용됩니다. 단순 `restart`는 새 `.env`를 읽지 않습니다.

상태·실제 접속 주소는 `bash scripts/dev-status.sh` 또는 `./scripts/dev-status.ps1`로 확인합니다. Vite 프록시는 같은 저장소 `.env`의 `CONTROL_PLANE_PORT`를 읽습니다. `INCIDENTLENS_API_TARGET`은 로컬 loopback 프록시만 허용하며, 비교 실행기의 대상 검증을 우회하지 않습니다.

## 메모리와 부하의 근거·범위

| 구성 | 고정 컨테이너 메모리 한도(MiB) | 이유 |
|---|---:|---|
| Java 앱 3개 | 각각 640 | JVM·프레임워크·계측을 위한 현재 개발 설정. heap 비율 65%와 프로세스 전체 한도는 다름 |
| MySQL | 768 | buffer pool 256 MiB, 최대 연결 100; DB 내구성 설정 유지 |
| Redis | 128 | Redis maxmemory 96 MiB와 프로세스 여유 |
| Kafka | 896 | heap 256–512 MiB와 프로세스 여유 |
| 웹 | 128 | 정적 파일·API 프록시 |
| Prometheus / Grafana / Loki | 384 / 256 / 384 | 현재 관측 프로필 한도 |
| Tempo / Collector | 1024 / 512 | 기존 Tempo 재생·블록 완료 과정에서 384 MiB 초과가 관찰됨; Collector 프로세스 여유 |

기본 한도 합계는 3840 MiB(3.75 GiB), 관측 추가는 2560 MiB로 총 6400 MiB(6.25 GiB)입니다. 한도 합계는 실제 사용량이나 최소사양이 아닙니다. 운영체제, Docker, 이미지 빌드, 남아 있는 다른 컨테이너와 디스크에 별도 여유가 필요합니다. 기존 문서의 Docker 가용 메모리 약 6/8 GB는 계획 추정치이며 저사양 성공 검증이 아닙니다. 검증하지 않은 가변 메모리 범위·저사양 프리셋은 제공하지 않습니다.

비교와 baseline의 기본값은 2 VUs, 단계별 10초입니다. 1–50 VUs, 5–300초를 허용하며 작은 시작 부하가 안전한 정상 동작을 보장하지는 않습니다. 종료 대기 때문에 실측 경과 시간이 설정한 시간보다 길 수 있습니다. `docker stats`, 오류율, outbox backlog, Kafka lag를 확인하고 다른 부하를 함께 실행하지 마세요. 회복 대기는 기본 5초, 허용 0–120초이며 대기열이 비었다는 보장이 아닙니다. 초기 유휴 확인은 3회 연속 0 backlog/lag(2초 간격), 기본 기한 300초·허용 5–900초입니다.

## 로컬 대상 일치와 비교 기록

Bash `scripts/local-target.sh`와 PowerShell `Get-LocalExecution`은 다음을 확인합니다. 검사 자체는 읽기만 합니다.

- Docker endpoint가 로컬 Unix socket 또는 Windows named pipe인지
- `CONTROL_URL` / `-ControlUrl`이 현재 Compose control-plane의 실제 loopback 호스트 바인딩과 일치하는지
- 컨트롤 플레인의 내부 `DEMO_API_URL`, `DEMO_WORKER_URL`과 k6 `BASE_URL`이 동일한 Compose 네트워크의 기본 서비스인지
- 실행 중인 서비스·메모리 한도·호스트 포트·계측 프로필이 구성과 일치하는지
- `/api/runtime` 응답 인스턴스가 확인한 컨테이너인지

불일치나 조회 불가이면 세션 생성·장애·부하 전에 차단합니다. 새 실행기를 기존 API 버전과 섞어 실행하지 않습니다. 원격 URL·Docker 컨텍스트·외부 네트워크를 추가하는 기능은 이번 범위에 없습니다. 종료 정리에서도 원래 인스턴스를 확인할 수 없으면 다른 대상에 해제 요청을 보내지 않고 수동 확인을 안내합니다.

새 실험에는 실제 컨테이너 이미지/메모리 한도/호스트 포트 해시, 인스턴스, 프로필, 선택적 `PC_LABEL`, 설정 부하, BEFORE/AFTER 제어 실행 구간과 k6 실측 경과 시간을 저장합니다. 구성 해시는 PC 하드웨어 성능의 동일성을 보장하지 않습니다. CPU·PC RAM·다른 트래픽·캐시 온도는 사용자 별도 기록이 필요합니다. 다른 PC의 결과를 같은 조건의 성능으로 비교하지 마세요. 이전 데이터에는 구성과 구간을 추정해 채우지 않습니다.

새 Flyway V2는 실험 테이블에 nullable 열만 추가합니다. 기존 기록이 있는 H2와 별도 MySQL에서 데이터 보존을 검증했습니다. 이번 검증은 기존 개발 DB에 마이그레이션하거나 개발 서비스를 배포하지 않습니다. 적용할 때는 새 API·웹·실행기 버전을 함께 사용하세요. 기존 데이터·볼륨 초기화는 필요 없습니다. [최종 검증 기록](VALIDATION_20261006_UI.md).
