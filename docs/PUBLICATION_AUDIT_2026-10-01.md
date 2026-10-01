# GitHub 공개 전 검증 — 2026-10-01

공개할 작업 파일과 `main`의 전체 이력에 대한 결과는 **PASS**다. 기존 API, 장애 시나리오, 데이터베이스 스키마와 업무 처리 코드는 변경하지 않았다. 아래 결과는 이번에 실제 실행한 검사이며, 기존 2026-09-22 성능 실험과 구분한다. 변경 파일은 검토할 수 있도록 미커밋 상태로 두었다. remote 변경 및 push는 수행하지 않았다.

검증 환경: Linux/WSL, Java 21.0.12.1, Gradle 8.14.3, Node 22.23.2, npm 10.9.8, Docker Engine 29.6.2, Compose 5.3.1. Docker에는 8 CPU, 약 7.71 GiB 메모리가 할당되어 있었다. 실제 `.env`에 따른 웹/Grafana 포트는 13000/13001이며, 기본값은 3000/3001이다.

공개 가능한 기계 판독용 결과는 [검증 요약 JSON](results/publication-audit-2026-10-01.json)에 있다. 전체 명령 로그, Gradle 결과 집계, k6 원본, 시계열, 실험/세션 응답, trace/log 증거, 비공개 백업은 로컬의 무시된 `artifacts/publication-audit-2026-10-01/`에 보존했다. 백업과 원본 로그는 공개 파일 목록에 포함하지 않는다.

## [TEST RESULT]

Backend tests:
- 실행 테스트 수: 50개 — 단위/애플리케이션 35개, Testcontainers 통합 15개.
- 성공: 50개.
- 실패: 0개. skipped: 0개.
- `./gradlew test --no-daemon`, `./gradlew clean build --no-daemon`, `./gradlew integrationTest --no-daemon`: 성공.

Frontend:
- build: PASS — TypeScript 및 Vite production build.
- lint: 해당 script 없음. 추가하거나 생략된 검사를 통과로 표시하지 않았다.
- test: Vitest 33/33, Playwright 15/15 성공. 캡처 경로 수정 후 기존 관련 사례 3개 추가 재실행 성공.
- `npm ci`: 성공, npm audit 보고 취약점 0건.

Docker:
- build: 웹 및 Java 서비스 3개 이미지 모두 성공.
- startup: 최초 Tempo OOM으로 실패, 아래 자원 설정 수정 후 전체 스택 기동 성공.
- unhealthy containers: 최종 0개. 서비스 12개 running, healthcheck가 정의된 9개 healthy.
- Loki/Tempo/Collector는 Compose healthcheck가 없어 running 상태와 실제 데이터 경로를 별도로 확인했다.

Infrastructure:
- MySQL: PASS — 실제 SQL 조회, Flyway 기반 애플리케이션 기동, 세 서비스 DB 사용 및 정합성 대조.
- Redis: PASS — PONG, 장애 설정 공유, 캐시 hit/miss 및 복구 확인.
- Kafka: PASS — `incidentlens.orders.v1`, `incidentlens.orders.v1.dlq` 존재, publish/consume 및 lag 증감 확인.

Smoke test:
- 결과: PASS — 세 서비스 health/readiness/Prometheus, control-plane 및 demo-api의 OpenAPI, 웹과 웹 프록시, overview/session/catalog 조회, 세션·주문 생성.
- 동일 주문 키 재요청: 같은 ID로 200. 최초 생성: 201. 다른 내용으로 키 재사용: 409.
- 새 주문은 worker DB에 fulfillment 한 건으로 도달했다.

Failure scenario:
- 재현 성공 여부: 기존 4개 시나리오 모두 성공.
- 관측된 현상: downstream timeout, 비효율 SQL 경로, 캐시 우회, Kafka consumer 지연 및 backlog 증가.
- 복구 성공 여부: 모두 성공. 모든 AFTER 요청 오류 0건. 종료 후 fault 없음, Kafka lag/outbox pending 모두 0.

Security:
- secret 노출: 공개 대상 파일/이력에서 실제 키·개인 이메일·사용자 경로 미발견. 로컬 데모 비밀번호와 테스트 전용 값은 환경변수 기본값/예시로 식별했다.
- `.gitignore` 문제: 환경변수 변형, target, 데이터/덤프, IDE/임시/검증 산출물 제외 규칙 보완. 필요한 설정, migration SQL, lockfile, wrapper 및 검토된 결과는 유지.
- Docker 빌드 컨텍스트에서도 환경변수 파일·자격증명 파일·로컬 데이터가 제외되도록 보완.

GitHub 공개 가능 여부: **PASS — 공개 작업 파일 및 정리된 `main` 기준. 로컬 원본 backup ref는 제외.**

## 구조와 빌드 분석

`settings.gradle`에 Java 프로젝트 네 개가 명시되어 있으며 Maven 프로젝트는 없다. `apps/web/package.json`이 유일한 프론트엔드 패키지다.

| 모듈 | 역할 | 일반 테스트 | 인프라 통합 테스트 |
|---|---|---:|---:|
| `apps/control-plane` | 세션, 장애 소유권, 실험 상태, 증거 및 RCA | 18 | 5 |
| `apps/demo-api` | 카탈로그, 멱등 주문, transactional outbox | 7 | 4 |
| `apps/demo-worker` | Kafka 소비, 중복 방지, fulfillment, lag | 4 | 6 |
| `libs/common` | 이벤트·문맥·텔레메트리·HTTP 보호 공통 코드 | 6 | 0 |

일반 `test`는 `integration` 태그를 제외한다. 첫 성공 실행은 UP-TO-DATE였으므로 그 결과를 신규 실행 횟수로 세지 않았다. 이어진 `clean build`에서 네 모듈의 35개 테스트를 실제 실행하고, 별도 `integrationTest`에서 15개를 실행했다. 공통 라이브러리에는 통합 태그 사례가 없다. Testcontainers는 격리된 임시 DB/Redis/Kafka를 사용했고 기존 Compose 데이터에서 테스트용 DELETE를 실행하지 않았다.

`infra/Dockerfile.backend`가 Java runtime 이미지를 만들고 `apps/web/Dockerfile`이 nginx 웹 이미지를 만든다. Compose의 기본 7개 서비스와 observability 5개 서비스가 기동됐다. k6는 실행 시에만 생성되는 loadtest 서비스다. 외부 LLM은 선택 기능이며 실제 API 키가 필요 없는 기본 rule-based RCA로 검증했다.

README의 축약 Kafka topic 표기를 실제 상수와 맞추고, 프로젝트 구조·직접 Docker 명령·서비스 endpoint·명시적 테스트 명령을 추가했다. 역사적 실험 수치는 변경하지 않았다.

## 실제 장애 실행과 복구

기존 `scripts/demo-compare.sh`와 k6 workload를 수정하지 않고 다음과 같이 실행했다. 매 실험 전에 원래 runner의 연속 3회 idle gate가 적용됐다. 부하는 기존 catalog GET + order POST이며, 관측 exporter를 활성화했다.

```bash
VUS=2 DURATION_SECONDS=5 PARAMETER=1800 RECOVERY_SECONDS=5 bash scripts/demo-compare.sh --scenario DOWNSTREAM_LATENCY
VUS=2 DURATION_SECONDS=5 PARAMETER=400 RECOVERY_SECONDS=5 bash scripts/demo-compare.sh --scenario DATABASE_DEGRADATION
VUS=2 DURATION_SECONDS=5 PARAMETER=400 RECOVERY_SECONDS=5 bash scripts/demo-compare.sh --scenario CACHE_DEGRADATION
VUS=5 DURATION_SECONDS=10 PARAMETER=2000 RECOVERY_SECONDS=20 bash scripts/demo-compare.sh --scenario KAFKA_SLOWDOWN
```

| 시나리오 | BEFORE/AFTER 요청 | BEFORE/AFTER 오류 | 확인한 근거 |
|---|---:|---:|---|
| DOWNSTREAM_LATENCY | 12 / 38 | 6 / 0 | `DOWNSTREAM_TIMEOUT`; 1,800 ms 설정이 기존 1,500 ms budget 초과 |
| DATABASE_DEGRADATION | 10 / 38 | 0 / 0 | `INEFFICIENT_QUERY`; DB 조회 p95 42.44 → 1.74 ms |
| CACHE_DEGRADATION | 32 / 52 | 0 / 0 | `CACHE_BYPASS`; 논리 DB 조회 16 → 1, cache hit 0 → 96.15% |
| KAFKA_SLOWDOWN | 148 / 160 | 0 / 0 | `CONSUMER_DELAY`; lag 0 → 최대 7 → 0, outbox 최대 79 → 0 |

fault 활성화 → 실제 workload → 저장된 증거와 RCA 인용 확인 → fault 해제 → 같은 부하의 AFTER → 두 queue drain → DB 정합성 순으로 검증했다. 각 RCA의 인용 ID가 실제 세션 증거에 존재함도 확인했다.

Kafka lag와 outbox를 2초 간격으로 관측했다. consumer 지연이 실행됐지만 더 큰 backlog는 outbox에 있었으므로 consumer만이 유일한 병목이라고 결론짓지 않는다. AFTER 완료 순간에는 lag가 남을 수 있어 최종 drain까지 별도로 기다렸다. 고정 VU의 짧은 단일 실행이고 캐시·JIT·관측 부하·디스크 영향을 통제한 반복 성능 실험이 아니므로 생산 처리량이나 일반적인 개선율을 주장하지 않는다. DB 시나리오는 SQL 경로와 캐시 동작을 함께 바꾼다.

## 데이터와 관측 검증

시작 전 **1,504건**이던 주문/outbox/처리 이력/fulfillment가 종료 후 각각 **1,750건**이었다. 증가한 246건은 smoke 주문 1건과 비교 실험 주문 245건에 대응한다.

- 주문에 대응하는 outbox/fulfillment 누락: 0.
- 주문 없는 fulfillment: 0.
- 같은 주문의 중복 outbox: 0.
- 주문과 fulfillment의 상품/수량 불일치: 0.
- 미발행 outbox 및 Kafka lag: 0.
- 활성 fault: 없음, overview 서비스 4개 모두 UP.

재전달·동시 요청·트랜잭션 rollback·DLQ는 실제 Kafka/MySQL 통합 테스트로 별도 확인했다. 이 결과는 실행한 요청의 최종 정합성과 멱등성을 검증하며 exactly-once transport를 주장하지 않는다.

Prometheus/Loki/Tempo/Collector 설정은 컨테이너의 native validator로 검증했다. 이어 `node scripts/verify-observability.mjs`가 실제 데이터를 검증했다: Prometheus application target 3개 UP, 양수 업무 요청 counter, Grafana 패널 13개, 세 데이터소스 연결, Loki worker 처리 로그 및 구조화된 장애 이벤트, demo-api와 demo-worker를 함께 포함하는 Tempo trace. trace에는 HTTP 주문 생성, outbox SQL, Kafka publish/process, 처리 이력/fulfillment SQL이 포함됐다.

Tempo 수정 후 기존 볼륨으로 기동했고 검증 중 재시작 0회, OOM 없음이었다. 메모리 표본은 144.2 MiB/1 GiB였다. 이 표본은 peak 또는 최소 필요 메모리 측정이 아니다.

## 발견한 문제와 수정

| 원인 | 수정 | 확인 |
|---|---|---|
| `384m` Tempo 제한에서 기존 WAL replay/Parquet block completion 중 OOM, exit 137 | 종료된 볼륨의 남은 데이터를 먼저 백업, `mem_limit: 1g`, `GOMEMLIMIT: 800MiB` | 전체 재기동 성공, 같은 볼륨의 trace 조회 및 네 실험 완료 |
| Playwright가 Git 추적 중인 `screenshots/dashboard-empty.png`를 덮어씀 | 원본 이미지 복원, `testInfo.outputPath`로 캡처 경로 변경 | 기존 assertions 그대로, 관련 3개 테스트 재통과, 추적 이미지 diff 없음 |
| ignore 규칙에 `.env.*`, target, 덤프/데이터/도구 산출물 등이 부족 | 루트 Git/Docker 및 웹 Docker ignore 보완 | 제외·유지 경로 검사, 새 Docker 빌드 성공 |
| 문서의 사용자 절대경로와 개인 이메일이 Git 이력에 남음 | 사용자 승인 후 실제 GitHub noreply identity로 전체 공개 이력 재작성, 경로 익명화 | 원본 backup 및 공개 ref 분리, 아래 전체 이력 검사 |
| README에 구조/직접 실행 설명이 부족하고 Kafka topic 이름이 축약됨 | 실제 설정·코드 및 이번 검증 기준으로 보완 | 파일 경로·명령·topic 상수 대조 |

기존 Tempo WAL 일부는 `meta.json` 부재 경고가 있었다. 이는 이번 기동에서 드러난 기존 관측 데이터의 복구 한계이며, 과거 trace의 완전성을 보장하지 않는다. 서비스 자체의 복구/retention 동작 외에 WAL, 볼륨 또는 업무 데이터를 수동 삭제하지 않았다. 남은 Tempo 데이터 백업은 ignored artifacts에 보존했다.

환경/검증 도구 문제도 분리했다. 최초 Gradle wrapper 호출은 sandbox의 cache 쓰기 제한으로 테스트 시작 전에 실패했고, 허용된 실행 환경에서 재실행했다. Tempo validator의 최초 호출은 필수 boolean 값 누락으로 종료하여 `-config.verify=true`로 바로잡았다. 임시 이력 검사에서 PNG 바이트를 이메일로 잘못 분류한 부분은 Git metadata에서 주소를 읽도록 수정했다. 이 과정에서 프로젝트 테스트를 삭제하거나 assertion을 약화하지 않았다.

## Git 이력·개인정보·push 대상 검사

GitHub CLI의 인증 계정 조회 결과는 **NIGHTPURI**, 숫자 ID는 **127381985**였다. 계정 생성일을 확인하고 [GitHub의 ID 기반 noreply 형식](https://docs.github.com/en/account-and-profile/reference/email-addresses-reference#your-noreply-email-address)에 따라 `127381985+NIGHTPURI@users.noreply.github.com`을 사용했다. 공개 이력 9개 커밋의 author/committer 18개 레코드와 이 저장소의 로컬 Git identity를 이 계정으로 설정했다. 임의의 Contributor 계정은 사용하지 않았다.

| 요청한 검사 | 결과 |
|---|---|
| 개인 이메일 검색 | 공개 `main`의 전체 9개 커밋 및 blob에서 0건 |
| Windows/Linux 사용자 절대경로와 로컬 사용자명 검색 | 공개 이력에서 0건 |
| secret/token/password/API key 검색 | 실제 credential 미발견; 환경변수 참조·데모 기본값·test-only key·lease/idempotency 식별자로 분류 |
| author/committer 확인 | `git log main`의 9개 모두 NIGHTPURI + 위 noreply 주소 |
| 작업 상태 확인 | 필요한 수정과 이 보고서/공개 요약만 미커밋; `.env`, 로그, DB 백업, 빌드 출력 제외 |
| push될 branch/tag/ref | branch `refs/heads/main` 하나, tag 없음 |
| 원본 backup의 공개 제외 | `refs/backup/pre-publication-2026-10-01`는 일반 branch/tag 목록 밖에 보존; 숨김 및 pre-push 검사 확인 |

공개 이력의 426개 객체를 검토했다. 고확신 secret 패턴은 binary 19개를 포함한 blob 276개에서도 별도로 검사했다. 이는 패턴 검사와 설정/코드 수동 검토의 결과이며, 모든 종류의 credential이나 모든 dependency/container 취약점에 대한 인증은 아니다. npm 감사의 0건 결과를 Java/container 전체에 확대하지 않는다.

최종 공개 후보 파일은 238개이며 약 3.45 MiB다. 가장 큰 파일은 검토된 데모 스크린샷 332,328 bytes이며 1 MiB 초과 파일은 없다. `.env`, 비공개 백업, 로그, 빌드/의존성 디렉터리와 데이터 볼륨은 후보 목록에 없었다. 전체 목록은 로컬 `artifacts/publication-audit-2026-10-01/publication-files.txt`에 있다. 문서의 로컬 링크 및 `git diff --check`도 통과했다.

**원본 보존과 공개 이력 정리는 구분된다.** 요청대로 원본 9개 커밋을 보존했으므로 backup까지 포함하는 `git log --all`/객체 검사에는 원래 개인 이메일을 가진 커밋 3개와 사용자 경로가 있던 문서 blob 1개가 남는다. 그 값을 이 보고서에 재기재하지 않는다. 공개 이력에서 원래 해당 문서의 경로만 바뀌었고, 업무 소스 blob은 보존됐다. 추가로 원본 Git bundle을 ignored artifacts에 보존했다.

로컬 `.git/hooks/pre-push`는 backup ref 및 원본 커밋을 포함한 다른 ref도 거부한다. 검증 입력에서 공개 main은 exit 0, backup 직접 전송 및 다른 branch로 위장한 원본 전송은 각각 exit 1이었다. `transfer.hideRefs=refs/backup/` 적용 후 로컬 `git ls-remote .`에도 HEAD/main만 광고됐다. 실제 `git push`는 실행하지 않았다. 이 로컬 보호 장치를 우회해 backup ref를 직접 전송해서는 안 된다.

최종 ref:

```text
refs/heads/main                            47521bf  (공개 대상, 9 commits)
refs/backup/pre-publication-2026-10-01       e08915b  (로컬 원본, 9 commits, 공개 제외)
tags                                      없음
remotes                                   없음 — 기존 상태 유지
```

## 변경 파일과 남은 범위

- `.gitignore`, `.dockerignore`, `apps/web/.dockerignore`: 공개/빌드 컨텍스트 제외 규칙.
- `docker-compose.yml`: 확인된 Tempo OOM의 메모리 예산 수정.
- `apps/web/e2e/dashboard.spec.ts`: 테스트 산출물 경로만 변경.
- `README.md`, `infra/README.md`, `docs/VALIDATION.md`: 실제 실행·구조·검증 설명.
- `docs/DOCKER_BUILD_DIAGNOSTICS.md`: 경로 익명화 설명.
- 이 보고서와 `docs/results/publication-audit-2026-10-01.json`: 이번 검증 결과.
- Git 내부 로컬 변경: 공개 이력, 원본 backup ref, noreply identity, ref 숨김 및 pre-push 보호.

미해결 애플리케이션 테스트 실패는 없다. 이전 Tempo trace의 완전성은 확인할 수 없고, 이번에는 PowerShell/네이티브 Windows 경로를 재실행하지 않았다. 공개 전 변경 사항을 검토해 커밋하면 된다. 현재 서비스는 실행 중이며, fault는 해제된 상태다. remote 설정·GitHub 저장소 생성·push는 수행하지 않았다.
