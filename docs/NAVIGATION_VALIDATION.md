# 탐색 UI와 MySQL 통합 검사 검증 — 2026-10-06

이 기록은 사용자가 승인한 세션 중심 탐색 UI를 적용한 뒤 실행한 결과입니다. [분리 당시 기록](SPLIT_VALIDATION.md)과 실패 로그를 덮어쓰지 않습니다. `backend-learning`은 변경하지 않았고, IncidentLens의 `feat/split-backend-learning` 브랜치만 사용합니다. main 병합과 배포는 하지 않습니다.

## 변경과 보존

첫 진입을 실험 세션 목록으로 바꾸고 로고도 같은 화면으로 연결했습니다. 홈·랜딩·시작 메뉴와 상단 중복 탐색을 제거했습니다. 공통 레이아웃은 모든 도구 탭에 같은 왼쪽 메뉴·현재 위치·세션 선택·테마·언어 선택을 제공합니다. 모바일에서는 키보드로 여닫는 접이식 메뉴를 사용합니다. 이전 홈 주소는 세션 목록으로 연결하고 직접 URL·history·새로고침·embed를 유지합니다.

장애·부하의 미제출 입력은 탭 이동 동안 보존하며 새로고침까지 저장한다고 표시하지 않습니다. 선택 세션과 기존 저장 키·legacy context의 기록은 보존합니다. 탐색만으로 장애·부하·보고서·기록 초기화를 실행하지 않습니다. 기존 브라우저 학습 데이터도 지우지 않습니다.

분리 완료 상태 `baf35a07e83eb56172f11879bdf38a3e44ad1022`와 소스 스냅샷을 보존했습니다. 기존 14개 실행 서비스와 DB·볼륨·복구 스택은 재시작·재생성·삭제하지 않았습니다. 사용자가 별도로 승인한 정확한 25개 정지 일회성 컨테이너만 로그·산출물을 다시 복사한 뒤 제거했고, 이후 일반 컨테이너 정리는 중단했습니다. 테스트가 소유한 임시 Testcontainers DB는 테스트 수명에 따라 정리하며 기존 DB에는 연결하지 않습니다.

## MySQL 시간 초과 진단과 수정

원래 전체 검사 두 번에서 `RcaPhaseLimitMySqlIntegrationTest` 3개 중 2개가 각각 실패했습니다. 실제 접속 대상은 기존 Compose MySQL이 아니라 매 실행 새로 생성한 MySQL 8.4.6의 `test` DB였습니다:

- 첫 실행: `host.docker.internal:56079`, 임시 컨테이너 `86e45dc6aeab…`.
- 재시도: `host.docker.internal:59236`, 임시 컨테이너 `57c4fa7539fa…`.

두 실행 모두 준비 검사 `SELECT 1`·Flyway와 일부 SQL이 성공한 뒤 신규 JDBC 연결에서 `SocketTimeoutException: Connect timed out`가 발생했습니다. SQL 처리 시간 초과와 인증 거부를 같은 원인으로 취급하지 않습니다.

별도 진단 DB에서는 호스트 전달 경로 `host.docker.internal:52697`(DNS `192.168.65.254`)와 bridge 내부 `172.17.0.4:3306`을 식별했습니다. 서버는 준비·인증 검사를 통과했고 OOM·재시작은 없었습니다. 최대 연결 151에 최대 관측 연결은 1, `Aborted_connects`와 연결 한도 오류는 0이었습니다. 비밀번호는 출력하지 않았습니다.

문제 테스트는 `DriverManagerDataSource`로 SQL마다 새 TCP 연결을 만들었습니다. 같은 진단 DB에서 1,600회 `SELECT 1`을 실행했을 때 비풀 방식은 서버 연결 수 9→1,610, 약 94.7초였습니다. Hikari 방식은 물리 연결 1개로 같은 1,600회를 약 1.8초에 실행했습니다. 이 수치는 이 PC의 **진단 실험**이며 제품 성능이나 다른 PC 성능 보장이 아닙니다.

테스트를 실제 앱처럼 테스트별 Hikari 풀(최대 2개, 최소 유휴 0개)로 변경했습니다. 테스트 완료와 마이그레이션 실패 때 풀을 닫습니다. SQL·500행 경계·인용·BEFORE/AFTER·보고서 저장/재조회 검증은 그대로이며 timeout을 늘리거나 테스트를 생략하지 않았습니다. 런타임 서비스 설정과 자격 증명도 변경하지 않았습니다.

**확인된 문제와 추론을 구분합니다.** 관측된 실패는 신규 연결의 TCP 연결 단계였고, 비풀 테스트의 과도한 연결 생성은 측정으로 확인했습니다. 풀은 이 연결 부담을 제거합니다. Docker Desktop 내부의 간헐적인 패킷 손실·포워딩 정체 등 저수준 원인까지 확정하지는 못했습니다. 진단 코드를 추가한 원래 테스트의 네 번 재실행도 통과했습니다. 따라서 실패가 매번 재현되었다거나 네트워크 자체를 완전히 수리했다고 주장하지 않습니다. 초기 실패와 모든 재검증 XML·로그는 로컬 ignored 자료에 보존합니다.

Docker Desktop 안에서 실행하는 테스트의 호스트 접속 설정은 [Testcontainers 공식 패턴](https://java.testcontainers.org/supported_docker_environment/continuous_integration/dind_patterns/)을 참고했습니다. 해당 설정이나 Docker/Windows 보안 정책을 바꾸지 않았습니다.

## 실제 실행 결과

| 검사 | 이번 실행 결과 |
|---|---|
| 수정한 실패 대상 MySQL 검사 | 3개 통과, 실패·오류·생략 0; 약 5.1초 |
| Java 21 전체 build·단위 검사 | 85개 통과, 실패·오류·생략 0 |
| 전체 MySQL·Redis·Kafka integrationTest | 19개 통과, 실패·오류·생략 0 |
| 최신 백엔드 소스 일치 | 수정 테스트 외 94개 소스·빌드 파일이 검증 이미지와 일치 |
| 웹 TypeScript·Vite build | 통과 |
| 웹 Vitest | 7개 파일·44개 통과 |
| 웹 Playwright Chromium | 데스크톱·노트북·모바일 57개 통과 |
| Bash 문법과 Compose core/observability/loadtest 구성 | 통과; 관측 도구 전체 기동과 구분 |
| 실제 별도 실험 스택 | 기존 7개 서비스 healthy, 별도 프로젝트·DB·loopback 포트 |
| 실제 장애→부하→근거→RCA→복구 비교 | CACHE_DEGRADATION, 2 VUs, 단계별 5초, 회복 대기 2초; COMPLETE |
| 실제 저장 결과 | 근거 90개, rule-based RCA, BEFORE 248요청·AFTER 300요청; 실행 구성·측정 시간 저장 |
| 실제 브라우저 재조회 | 보고서·비교·선택 세션을 새로고침 후 복원, 읽기 단계 API 쓰기·예외 0 |
| 장애 정리 | 실험 스택과 원래 스택 모두 activeFault 없음 |
| 한영 README 캡처 | 같은 현재 UI·1440×1000·라이트, 언어별 3장; GET 전용·실제 저장 기록, fixture 없음 |

UI 회귀는 세션 우선 진입, 학습/landing 없음, 모든 탭의 같은 탐색과 선택 상태, legacy 실험 context 분리 보존, 직접 링크·뒤로가기·새로고침·로고·embed, OS 준비안·언어·테마 독립 저장, 기존 시스템 테마 일회성 변환, 모바일·키보드·초점·색 대비, 명시적인 네 장애 제어를 확인합니다. API fixture 검사는 실측 결과가 아닙니다.

실제 실험은 `incidentlens-split-check`의 control 19380·demo-api 19381·worker 19382를 사용했습니다. 승인 UI의 별도 브라우저 검증 서버가 이 로컬 API에 연결해 새 세션/비교를 만들었고, 대상 일치를 확인한 공식 `demo-compare.sh`가 장애·k6·RCA·복구를 실행했습니다. 대상이 다른 CONTROL_URL은 쓰기 전에 차단됐습니다. 사용한 장애는 해제했고 새 실험 기록은 별도 DB에 보존했습니다.

브라우저 실제 실험 자동화의 첫 시도는 버튼의 `+`를 제외한 정확한 이름을 기다리다 장애 활성화 전에 실패했습니다. 테스트 도우미의 조회를 수정했고 요청 Content-Type도 전달하도록 실험용 프록시를 보완했습니다. 이후 실제 흐름을 모두 완료했습니다. 이 실패 역시 로그로 남겼으며 제품 API 문제로 보고하지 않습니다.

## 캡처·문서·CI

`apps/web/screenshots/navigation-{ko,en}-{sessions,lab,technology}.png`는 최신 소스를 실제 브라우저에서 캡처한 화면입니다. 한국어 README.md와 호환 README.ko.md에는 한국어 UI, README.en.md에는 영어 UI만 연결합니다. 기술 이름이나 실제 저장한 세션 이름은 번역한 측정값으로 바꾸지 않습니다. 이미지 해시·크기·테마·캡처 시각은 `navigation-capture.json`에 있습니다. 종전 캡처와 분리 검증 기록은 과거 기록으로 보존하며 새 결과로 재사용하지 않습니다.

README의 로컬 파일/이미지 링크·환경변수 예제·호스트/컨테이너 포트·명령을 확인합니다. 현재 기본 README는 한국어입니다. 기존 README.ko.md 경로와 주요 명시적 앵커도 유지합니다.

최신 커밋의 GitHub Actions `backend`·`web`·`compose` 결과는 해당 SHA로 별도 확인합니다. 과거 커밋의 CI 성공을 이번 커밋 결과로 사용하지 않습니다. 로컬에서 전체 core 런타임 이미지를 다시 빌드/교체하지 않았으며 CI의 Compose 잡이 별도 러너에서 이를 검사합니다.

## 남은 한계

- Windows PowerShell 파일 검사는 현재 execution policy 때문에 로컬 실행이 차단됐습니다. 정책을 변경하거나 우회하지 않았습니다. CI의 Linux PowerShell 검사는 Windows에서의 실행 확인을 대신하지 않습니다.
- 관측 도구 5개 전체 기동·저사양·다른 PC 동일 조건 성능·진단 정확도·운영 실적·사용자 프로젝트 연동은 검증/구현하지 않았습니다. 실제 검증은 기본 자체 데모 스택과 캐시 장애 한 시나리오입니다.
- 기존 잠금 파일의 source-map-js 보안 권고 1건과 Gradle deprecation 경고는 이전 기록대로 남습니다. 유료 LLM을 호출하지 않았습니다.
- 수정은 연결 생성 부담을 제거한 테스트 자원 관리 개선이며 모든 Docker Desktop TCP 경로의 무장애 보장이 아닙니다.
- 이번 커밋은 작업 브랜치에만 push합니다. main 기본 첫 화면은 병합 전까지 바뀌지 않으며 공개 서비스 배포는 수행하지 않습니다.

## 실행·복구

저장소 루트 `bash scripts/dev-up.sh`, `bash scripts/dev-status.sh`가 공식 로컬 실행/상태 명령입니다. Java 21·Docker에서 `./gradlew build integrationTest --no-daemon`, 웹 폴더에서 `npm test`, `npm run build`, `npm run test:browser`로 재검증합니다.

현재 미커밋 작업을 임의로 reset하지 않습니다. 탐색 전 소스 tar와 기존 분리 Git bundle·실험 데이터는 보존합니다. 이전 커밋을 별도 worktree에 열거나 소스 스냅샷을 별도 폴더에 풀어 검토할 수 있습니다. `.env`·DB·볼륨 초기화나 기존 저장소 삭제는 복구에 필요하지 않습니다. 비공개 학습 저장소와 그 브라우저 기록은 이 작업 범위에서 변경하지 않습니다.
