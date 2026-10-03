# 실제 HTTP·정식 빌드 검증 재시도 — 2026-10-03

**상태: 실제 HTTP와 앱 화면 검증은 환경 제약으로 미완료다.** 직접 JUnit 결과를 Gradle/실제 HTTP 통과로 바꾸어 기록하지 않는다. 출발 브랜치 `improve/rca-response-budget`, HEAD `6fe9ea5`, 작업 트리는 깨끗했다. 기존 구현과 데이터는 수정하지 않았다.

## 실행한 결과

| 실행 | 실제 결과 |
| --- | --- |
| `./gradlew test --no-daemon` | 종료 1. Gradle wrapper의 `~/.gradle/.../gradle-8.14.3-bin.zip.lck`가 Read-only file system. 테스트 진입 전 실패 |
| `./gradlew build --no-daemon` | 종료 1. 같은 wrapper lock 실패. 빌드 성공으로 볼 수 없음 |
| Python loopback bind | `[Errno 1] Operation not permitted` |
| 새 `RcaHttpTransportTest` 직접 JUnit 실행 | 컴파일 성공. 10개 모두 `@BeforeEach`의 HttpServer 생성에서 SocketException. 준비 실패이며 전송/취소 assertion은 실행되지 않음. 숨긴 skip 없음 |
| 기존 소켓 없는 직접 JUnit 검사 | 56/56 통과. 50개 production 소스와 19개 test 소스 컴파일. 캐시된 JAR 사용으로 Gradle 의존성 해석과 구별 |
| 기존 `RcaReportFlowTest` | 위 56개에 포함. 실제 MockMvc/controller/service/JDBC/H2로 정상 생성 → 모의 외부 실패 → 규칙 보고서 저장 → 상세 조회 통과 |
| `docker ps` | 종료 1. 현재 WSL에서 Docker command unavailable. Docker Desktop WSL integration 안내가 출력됨 |
| `ss -ltn` | netlink socket 접근 금지. 기존 서비스 목록을 충분히 확인하지 못함 |
| `npm --prefix apps/web run dev -- --host 127.0.0.1 --port 14173 --strictPort` | 종료 1. `listen EPERM 127.0.0.1:14173`. 앱 화면 열기/클릭/스크린샷 미수행 |

권한 변경, 별도 실행 환경을 통한 소켓 제한 우회, 기존 프로세스 중단, Docker 데이터 삭제, 유료 API 호출은 하지 않았다. 실제 GitHub 반영도 하지 않았다. 이번 결과만으로 원격 반영 준비가 완료됐다고 볼 수 없다. 이전 2026-10-01의 README audit와 2026-10-02 직접 JUnit 결과는 각각 그 날짜의 기록이다.

기계 판독 결과: [JSON](results/rca-http-verification-2026-10-03.json). 로컬 원본 로그는 ignored `artifacts/verification-20261003/gradle-test.log`, `gradle-build.log`, `http-attempt.log`, `direct-junit.log`, `environment-probe.json`에 있다.

## 추가한 실제 HTTP 테스트

[`RcaHttpTransportTest`](../apps/control-plane/src/test/java/io/incidentlens/control/RcaHttpTransportTest.java)는 JDK HttpServer를 `127.0.0.1`의 임의 포트에 바인딩하고 실제 HttpClient로 호출한다. 외부 proxy를 사용하지 않고 키/모델명은 가짜 fixture다. 소켓 없이 동작하는 HTTP mock 테스트와 별개다.

- 정상 인용 보고서.
- 정확히 65,536 **UTF-8 바이트**의 JSON envelope: Content-Length 있음/청크 전송 각각 허용. 본문에 한글을 포함한다.
- Content-Length 65,537: 서버가 본문을 보내기 전에 거절되는지 검사. provider timeout은 10초, 결과 대기는 3초로 헤더 거절과 시간 초과를 구분한다.
- Content-Length 없는 청크 전송에서 상한 +1: client 거절 후 서버의 후속 쓰기에서 연결 종료가 관찰되는지 검사.
- HTTP 429/503: 본문 완료를 기다리지 않고 중단하는지 검사.
- 응답 헤더 지연/헤더 수신 후 본문 정지: 테스트용 1초 제한으로 요청 종료 및 서버 측 연결 종료를 검사. 운영의 20초를 실제로 기다렸다는 뜻은 아니다.
- 정상 실제 HTTP 보고서 이후 503 발생 → 규칙 보고서로 교체 → 실제 H2에서 재조회, 보고서 행 1개와 폴백 counter 1 확인.

연결 종료를 기다리는 assertion은 테스트 정리(`server.stop`) **전에** 수행한다. 서버를 스스로 중단해서 취소 테스트가 거짓 통과하지 않게 했다. TCP 버퍼 때문에 서버가 64 KiB보다 많은 데이터를 전송할 수 있으므로 상한은 애플리케이션의 본문 누적량이지 전선 위의 전체 바이트 수가 아니다. 이 서버는 HTTP/1.1이며 HTTP/2 검증은 아니다.

위 10개는 **실행 준비용 변경이며 아직 동작 검증이 끝나지 않았다.** 컴파일만 통과했다. 현재 환경의 준비 실패만으로 production code의 버그나 회귀를 판정할 수 없어 기존 production 구현을 바꾸지 않았다. 신규 테스트와 이번 문서 변경은 커밋하지 않고 작업 트리에 남겼다. 기존 두 커밋은 보존했다.

## 사용자 터미널에서 실행할 정식 명령

일반 사용자 터미널에서 실행한다. 권한 상승 명령이나 Gradle 우회 설정은 필요하지 않다.

```bash
cd /home/mireu/Dev/incident-lens-career-20261002
./gradlew :apps:control-plane:test --no-daemon --rerun-tasks \
  --tests 'io.incidentlens.control.RcaHttpTransportTest'
./gradlew test --no-daemon
./gradlew build --no-daemon
```

첫 명령은 위 실제 HTTP 10개를 실행한다. 결과는 `apps/control-plane/build/reports/tests/test/index.html` 및 `build/test-results/test/TEST-io.incidentlens.control.RcaHttpTransportTest.xml`(해당 모듈 디렉터리 기준)에서 확인한다. 이후 전체 `test`의 보고서는 각 모듈의 `build/reports/tests/test/`에 있다. `test`/`build`는 Docker `integration` tag를 제외한다. Docker가 준비된 뒤 필요하면 `./gradlew integrationTest --no-daemon`으로 기존 실제 인프라 테스트를 별도로 확인한다.

## 기존 서비스와 분리한 앱 실행

README 기본 `docker-compose.yml`은 **프로젝트 이름 `incidentlens`와 8080/8081/8082 포트가 고정**되어 있다. 이 worktree에서 무심코 기본 dev-up을 실행하면 기존 같은 프로젝트의 컨테이너를 갱신할 수 있다. 이번에는 실행하지 않았다.

현재 머신에 검증용 실행 파일을 준비했다. 이 파일은 저장소의 새 서비스 기능이 아니라 ignored 로컬 인수인계 자료다. 쉘 문법 검사만 통과했고 Docker 실행은 확인하지 못했다.

```bash
bash /home/mireu/Dev/incident-lens-career-20261002/artifacts/verification-20261003/start-isolated.sh
```

스크립트는 다음 순서로 동작한다.

1. Docker 접근 가능 여부를 확인한다. 현재처럼 WSL integration이 없으면 여기서 종료한다. Docker Desktop 설정 변경은 사용자가 직접 결정한다.
2. `incidentlens-rca-20261003` 프로젝트에 기존 컨테이너나 볼륨이 있으면 재사용하거나 삭제하지 않고 중단한다.
3. 18000/18080/18081/18082 포트가 비어 있는지 확인한다. 다른 프로세스를 종료하지 않는다.
4. 원본 Compose를 보존하고 `artifacts/verification-20261003/compose.local.yml` 복사본의 API 포트 3개만 18080/18081/18082로 바꾼다. `--project-directory`로 기존 build/설정 경로를 유지한다.
5. 프로젝트 이름을 분리해 새 볼륨을 사용하고 `WEB_PORT=18000`, `RCA_API_KEY=''`, `RCA_MODEL=''`로 유료 모델을 비활성화한 뒤 README의 `up --build -d --wait --wait-timeout 600` 흐름을 실행한다. 기존 `.env`는 수정하지 않는다.

**실행에 성공했을 때 열 주소:** 대시보드 `http://127.0.0.1:18000`, API 문서 `http://127.0.0.1:18080/swagger-ui/index.html`. 지금 켜져 있다는 뜻은 아니다. 이 별도 스택은 README와 마찬가지로 Docker 메모리가 대략 6GB 필요하므로 기존 스택과 함께 실행할 여유도 필요하다.

## 화면에서 생성·재조회 순서

아래는 현재 UI 코드와 한국어 label을 확인해 작성한 절차이며 **이번에 직접 눌러 성공한 기록은 아니다**.

1. 대시보드 → **장애 실험실** → **다운스트림 지연**, 새 세션 이름 입력 → **세션 생성 +**.
2. **증거 및 RCA**에서 방금 세션 선택 → 관측 단계 **변경 전(BEFORE)** → **증거 수집** → **RCA 생성**.
3. **RCA 보고서 보기 ↓**를 눌러 제공자가 `rule-based`인지, 근거 ID와 불확실성이 표시되는지 확인한다. 새 트래픽이 없으면 근거 부족·confidence 0은 정상이다.
4. 브라우저를 새로고침한 뒤 같은 세션을 다시 선택한다. **RCA 생성 버튼을 다시 누르지 않고** 기존 보고서와 생성 시각·인용을 확인한다. 생성과 재조회를 혼동하지 않기 위해서다.

이 화면 실행은 키가 없는 기본 규칙 경로다. **LLM 오류 이후 폴백** 검증은 위 실제 HTTP 테스트에서 별도로 수행해야 한다. 같은 `rule-based` 표기만으로 외부 오류가 발생했다고 판단하면 안 된다.

실제 지연 증거까지 보려면 별도 검증 스택의 세션에서만 장애를 400ms로 활성화한 뒤, UI의 세션 UUID를 다음 명령에 넣고 요청을 발생시킨다. 그 후 BEFORE 증거 수집/보고서 생성, 장애 비활성화 순으로 진행한다. 다른 기존 실험은 건드리지 않는다.

```bash
RCA_CHECK_SESSION='여기에 방금 만든 세션 UUID'
for attempt in $(seq 1 10); do
  curl --fail --silent --show-error --max-time 5 \
    -H "X-Incident-Id: $RCA_CHECK_SESSION" -H 'X-Experiment-Phase: BEFORE' \
    'http://127.0.0.1:18081/api/catalog?category=books' >/dev/null || break
done
```

기존 browser fixture E2E는 실제 backend 화면 검증과 다르므로 이번 미완료 상태를 그것으로 대체하지 않는다. 기존 `capture-live.mjs`도 완료된 BEFORE/AFTER 실험을 전제로 하므로 위 간단한 보고서 확인에 그대로 사용하지 않는다.

## 쉬운 설명과 읽을 코드 세 곳

이전에는 외부 응답을 큰 봉투째 모두 받은 후에 크기를 쟀다. 개선 후에는 조금씩 받으면서 누적량을 세고, 너무 크면 더 받지 않도록 요청한다. 끝없이 기다리지 않도록 시간도 제한했다. 외부 분석이 실패해도 가지고 있는 관측값으로 규칙 보고서를 만들고 저장하는 흐름은 유지한다. 이 설명의 실제 통신 부분은 위 테스트를 정상 환경에서 통과한 뒤 확정해야 한다.

1. [`RcaService.generate/get`](../apps/control-plane/src/main/java/io/incidentlens/control/RcaService.java): 증거 선택 → 외부 분석/규칙 대체 → 검증 → 저장 → 재조회라는 전체 흐름.
2. [`OpenAiCompatibleRcaProvider.analyze/receive`](../apps/control-plane/src/main/java/io/incidentlens/control/OpenAiCompatibleRcaProvider.java): 호출하고 응답 완료를 기다리는 시간, 실패 변환과 요청 취소.
3. [`RcaResponseBody.onNext`](../apps/control-plane/src/main/java/io/incidentlens/control/RcaResponseBody.java): 헤더 조기 거절, 실제 청크 바이트 합계, 상한 초과 시 복사 전 중단, UTF-8 해석.

원격 push/배포 금지 지시를 유지했다. 마지막 GitHub 반영 요청의 전제인 실제 검증과 화면 사용이 완료되지 않았으므로 원격 쓰기를 진행하지 않았다.
