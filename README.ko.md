# IncidentLens

[한국어](README.ko.md) · [English](README.md)

IncidentLens는 로컬에서 실행하는 백엔드 학습 실험실입니다. 실제 코드를 따라 요청과 데이터의 이동을 살피고, 장애 결과를 예측한 뒤, 선택한 세션에만 장애를 적용합니다. 증거를 읽고 장애를 해제해 회복을 비교합니다. 서비스를 켜지 않아도 개념 학습은 가능하며, 실측에는 로컬 스택이 필요합니다. 계정이나 유료 API는 필수가 아닙니다.

![요청 흐름과 학습 도움을 보여주는 한국어 학습 화면](apps/web/screenshots/learning-ko-desktop.png)

## 학습 순서

1. **요청과 응답:** HTTP/API와 Spring Boot가 요청을 접수·검증하고 응답합니다. 주문 응답 성공은 worker의 후속 처리 완료를 뜻하지 않습니다.
2. **DB와 트랜잭션:** MySQL에 주문을 지속 저장합니다. 주문과 outbox 이벤트는 한 트랜잭션에 기록합니다.
3. **캐시:** Redis가 반복 상품 조회를 줄입니다. 적중·미적중·대체 조회·명시적 우회를 구별합니다.
4. **비동기 처리:** Kafka가 접수와 데모 worker의 처리를 분리합니다. Docker가 구성요소를 나눠 실행하고 k6가 정해진 부하를 재현합니다.
5. **Outbox와 중복 방지:** relay는 DB 커밋 뒤 발행합니다. Kafka가 받은 뒤 outbox 완료 표시가 실패하면 중복 전송될 수 있어 worker가 이벤트 효과의 중복을 막습니다. 종단 간 exactly-once 보장은 아닙니다.
6. **장애 분석과 회복:** 지표는 추세, 로그는 사건, 추적은 요청 구간을 보여줍니다. RCA는 관찰과 가설을 분리합니다. 규칙 보고서가 기본이고 호환 LLM은 선택 사항입니다.

각 기술은 문제 상황, 쉬운 비유, 실제 동작, 선택 이유, 단점과 대안, 장애 증상, 관련 코드 순서로 설명합니다. 두 흐름도의 노드와 화살표를 누르면 역할과 실패 경계를 볼 수 있습니다. IncidentLens 로고를 누르면 학습 홈으로 돌아가고 **이어서 학습**은 마지막 학습을 엽니다. 예측 메모, 선택한 장애·세션, 홈/학습 화면 상태는 새로고침 후에도 보존됩니다. 오른쪽 도움은 작성된 힌트이며 AI 채팅이 아닙니다.

## 전체 흐름

```mermaid
flowchart LR
  Browser[브라우저] -->|GET /api/catalog| API[Spring demo-api]
  API -->|적중 / 미적중| Redis
  API -->|미적중 / 우회| Catalog[(MySQL 상품)]
  Browser -->|POST /api/orders + Idempotency-Key| API
  API -->|한 트랜잭션| Orders[(MySQL 주문 + outbox)]
  Orders --> Relay[Outbox relay]
  Relay --> Kafka
  Kafka --> Worker[demo-worker]
  Worker --> WorkerDB[(MySQL 처리 기록)]
  Web[React 학습 화면] --> Control[control-plane]
  Control -->|세션별 장애·증거·실험·RCA| API
  Control --> Worker
```

worker는 후속 처리를 시연할 뿐 실제 카드 결제나 배송을 하지 않습니다. 하나의 로컬 MySQL 인스턴스 안에 서비스별 DB가 분리되어 있습니다. 장애는 세션 ID에만 적용되고 동시에 하나만 활성화되며 15분 뒤 만료됩니다. [구조와 실패 경계](ARCHITECTURE.md) · [API 문서](docs/API.md).

## 로컬 실행

Docker Engine/Desktop과 Compose가 필요합니다. 저장소 루트에서 실행합니다.

```bash
bash scripts/dev-up.sh
```

**http://localhost:3000** 또는 로컬 `.env`의 `WEB_PORT`를 엽니다. 학습을 읽고 예측을 적은 다음 네 장애 중 하나를 골라 세션을 만드세요. 화면에 서비스 연결 상태가 표시됩니다. `bash scripts/dev-down.sh`는 이름 있는 볼륨을 보존합니다. 첫 실행에서는 이미지와 의존성을 받습니다. 추적·검색 로그·Grafana가 필요하면 `bash scripts/dev-up.sh --observability`를 사용하세요. 이 관측 도구들은 기본 학습에 필수가 아닙니다.

백엔드 스택을 켜둔 채 프런트엔드를 개발할 때:

```bash
cd apps/web
npm ci
npm run dev
```

**http://localhost:5173**을 엽니다. 다른 로컬 컨트롤 플레인 포트는 `INCIDENTLENS_API_TARGET=http://127.0.0.1:18080 npm run dev`로 Vite의 `/api` 프록시를 지정할 수 있습니다. 백엔드가 없어도 학습은 보이며 실험 결과가 없음을 표시합니다. `?view=lab`은 기존 숙련자용 장애 실험실을 바로 열고, `?embed=1`은 호스트 사이트 메뉴를 위해 IncidentLens 내비게이션을 숨깁니다.

## 네 가지 통제 장애

| 장애 | 세션에 적용되는 변경 | 확인할 증거 |
|---|---|---|
| 외부 연동 지연 | 상품 조회의 재고 조회 시뮬레이션을 지연하며 1,500ms를 넘으면 시간 초과 | 요청 p95, timeout 이벤트, 재고 조회 추적 구간 |
| DB 비효율 | 비효율 상품 조회를 사용하고 **캐시도 우회** | DB 조회 시간, 논리적 DB 로드, 요청 p95 |
| worker 지연 | 주문 이벤트마다 worker 트랜잭션 전에 지연 | Kafka 소비 대기량, 처리 이벤트, 재시도 |
| 캐시 우회 | 상품 목록의 Redis 읽기와 요청 모으기를 건너뜀 | 캐시 적중률, DB 로드, 요청 p95 |

브라우저에서 세션 생성, 장애 설정·해제, 증거 수집, RCA 요청, 비교 실험 준비를 할 수 있습니다. **k6는 브라우저가 아닌 터미널에서 실행됩니다.** 완전한 BEFORE/AFTER 실측은 화면에 표시되는 명령 또는 다음 예시로 실행합니다.

```bash
SCENARIO=CACHE_DEGRADATION VUS=2 DURATION_SECONDS=10 bash scripts/demo-compare.sh
```

Bash 실행기에는 `curl`, `jq`, Docker가 필요합니다. 서비스 상태와 빈 대기열을 확인하고 장애 활성 상태의 BEFORE를 측정합니다. RCA를 생성하고 장애를 해제한 뒤 같은 부하로 AFTER를 측정하며 종료 시 정리도 시도합니다. PowerShell에서는 `./scripts/demo-compare.ps1 -Scenario CACHE_DEGRADATION -Vus 2 -DurationSeconds 10`을 사용합니다. 새로고침 후 **실험 비교**에서 저장 결과를, **증거 및 RCA**에서 보고서를 확인하세요. 미측정 값은 0이나 정상으로 간주하지 않습니다. 사용자 수·시간뿐 아니라 캐시 온도, 기존 대기량, 다른 트래픽도 확인해야 합니다. DB 장애는 캐시도 우회하므로 한 효과만의 성능 변화라고 해석하면 안 됩니다.

## 언어와 증거

상단의 **한국어 / English**로 전환합니다. 두 언어 모두 학습 본문, 흐름도, 질문, 힌트, 제어, 오류, 기존 대시보드를 포함합니다. 전환해도 위치·입력·선택한 실험은 유지됩니다. 원본 로그·코드·기존 RCA 보고서는 작성 언어 그대로 남으며 UI 전환으로 번역되지 않습니다. 저장 증거에는 출처, 시간 구간, 사용 가능한 경우 값·단위가 있습니다. RCA 보고서는 인용한 증거 ID, 추정 원인, 영향, 조치, 불확실성을 분리합니다. 선택적 호환 LLM의 응답은 **수신 중 65,536바이트로 제한**되며 초과나 시간 초과 시 취소하고 규칙 분석을 사용할 수 있습니다. [HTTP 경계 검증](docs/RCA_HTTP_VERIFICATION_2026-10-03.md).

## 검증과 한계

개편 화면은 TypeScript/빌드, Vitest, Playwright로 학습 이동, 언어 보존, 데스크톱·모바일 배치, 키보드, 연결 끊김, 명시적 장애 제어를 검증합니다. Java 테스트는 요청·저장·RCA 경계를 확인합니다. 이번 실행 결과와 제한은 [학습 개편 검증 기록](docs/LEARNING_VERIFICATION_2026-10-03.md)을 참고하세요. 이전 실측 결과는 당시 기록으로 남깁니다: [2026-10-01 공개 감사](docs/PUBLICATION_AUDIT_2026-10-01.md), [2026-10-03 RCA 실환경 검증](docs/RCA_LIVE_VERIFICATION_2026-10-03.md). 화면 캡처는 로컬 UI이며 브라우저 테스트의 fixture는 성능 실측이 아닙니다.

이 실험실은 학습용으로 운영 규모나 신뢰성을 보장하지 않습니다. 공유 lag 지표에는 다른 트래픽이 섞일 수 있고, 측정 시간창과 캐시 온도에 따라 비교가 달라집니다. 선택적 Grafana/Tempo/Loki는 상세 관측을 돕지만 기본 증거 점검을 대신하지 않습니다. 데모 worker에는 실제 결제·배송 연동이 없습니다.

## 쉬었음.com 메뉴 아래 재사용

모듈은 [`apps/web/src/learning/`](apps/web/src/learning/)에 있습니다. `content.ts`는 한영 학습·장애 콘텐츠, `LearningLab.tsx`는 상호작용과 API 연결, `styles.css`는 디자인 규칙입니다. `App.tsx`가 기존 `api.ts`를 통해 컨트롤 플레인에 연결합니다. 호스트 메뉴 아래에서는 `?embed=1`로 자체 내비게이션을 숨길 수 있습니다. `/api`는 **별도의 로컬 또는 안전하게 통제된 학습 백엔드**로 연결해야 하며 공개 운영 서비스에 장애·부하 제어를 연결하면 안 됩니다.

스터디·커뮤니티 목록 캐시와 Todo 알림 큐는 **공개 기능을 소재로 한 가정·후보**이지 쉬었음.com 내부 구조에 대한 설명이 아닙니다. 먼저 반복 조회량, DB p95, 알림 지연 허용치, 중복 위험을 측정하세요. 근거가 없다면 DB 직접 조회나 동기 작업이 더 단순합니다. 이 저장소 작업은 운영 사이트나 팀 저장소를 수정하지 않습니다.

## 프로젝트 구성

`apps/demo-api`는 상품·주문·outbox, `apps/demo-worker`는 이벤트 소비, `apps/control-plane`은 세션·장애·증거·비교·RCA를 담당합니다. `apps/web`은 학습 화면과 기존 대시보드입니다. `loadtest/`에 k6 부하, `scripts/`에 로컬 실행기, `infra/`에 컨테이너 설정, `docs/`에 설계·검증 기록이 있습니다. [웹 개발 안내](apps/web/README.md)와 [운영 문서](docs/OPERATIONS.md)도 참고하세요.

## 백엔드 학습실 완료 범위

Java·Python·JavaScript/TypeScript·C# 과정을 왼쪽 단계 목록(모바일 열기/닫기)에서 학습합니다. 언어 기초→HTTP/API→DB/트랜잭션→인증/권한→테스트→운영→캐시→동시성/중복→비동기→장애/복구를 실제 예제와 독립 과제로 연결합니다. [언어 예제](examples/language-paths/README.md), [학습 결과 지도](docs/BACKEND_LANGUAGE_PARITY.md), [실행 검증 기록](docs/VALIDATION_20261005.md)을 확인하세요. TypeScript는 고정 의존성으로 컴파일한 서버를 실제 실행합니다. SQLite·로컬 캐시·polling은 Redis/Kafka 검증으로 표시하지 않습니다.

언어별 진도·읽기·자기 확인과 학습/자유실험실 세션 선택을 분리하고 한영·OS·테마·새로고침·뒤로 가기를 유지합니다. 화면 이동은 장애 설정/해제나 RCA 재생성을 실행하지 않으며, 실제 활성 장애 경고는 계속 표시합니다. RCA는 SQL에서 BEFORE를 먼저 선택한 뒤 최신 500건을 제한합니다. 일반 증거에는 AFTER를 유지하고 저장된 보고서의 인용은 같은 세션에서 복원합니다.

확인 순서: 저장소에서 `cd apps/web`, `npm ci`, `npm run dev -- --host 127.0.0.1 --port 5173` → `http://127.0.0.1:5173` → 한영/OS/언어 선택 → 첫 수업 → 실습 기록 → 관련 기술 안내 → 준비됐을 때 자유실험실을 직접 선택합니다. 개발 서버의 API 프록시 기본값은 `http://127.0.0.1:8080`입니다. 실험실 연결이 없어도 수업은 읽을 수 있습니다.

2026-10-06 후속 작업에서 필요한 main 앱 이미지 두 개를 적용하고 배포된 RCA의 500건 경계를 검증했습니다. 완성된 Docker 학습 화면은 `http://127.0.0.1:13000`, Prometheus는 `13090`, Grafana는 `13001`입니다. 기존 DB·컨테이너·볼륨을 보존하고 앱 되돌리기·재적용까지 실제 확인했습니다. 보존 컨테이너가 있는 이 작업 폴더에서는 일반 Compose `up/down` 대신 [main 배포·검증·되돌리기 기록](docs/MAIN_LOCAL_DEPLOYMENT_20261006.md)의 도구를 사용하세요. [초기 복구 기록](docs/LOCAL_BACKEND_RECOVERY_20261006.md)도 유지합니다.
