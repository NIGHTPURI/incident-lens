# RCA 실제 실행 재검증 — 2026-10-03

Docker Desktop을 켠 뒤 WSL에서 다시 실행한 기록이다. 제출한 이력서의 성과가 아니라 **제출 이후 개선의 검증 기록**이며, 이전 제한 환경의 실패 기록은 덮어쓰지 않는다. 브랜치는 `improve/rca-response-budget`, 검증한 HEAD는 `6fe9ea5249442c4f7d42700baa1e1db138441e7a`다. 기존 미커밋 `RcaHttpTransportTest.java`를 포함한 작업 트리로 테스트했다.

## 환경 및 작업 보호

- `docker version`, `docker info`: 서버 연결 성공. Client/Server 29.6.2, Compose 5.3.1. 이번에는 Gradle 캐시 쓰기와 loopback 소켓도 동작했다. 권한 변경이나 제한 우회는 없었다.
- 실행 전 `artifacts/verification-20261003/start-isolated.sh`와 실제 Compose 해석 결과를 검토했다. 같은 검증 프로젝트의 기존 컨테이너/볼륨이나 사용 중인 포트가 있으면 중단하며, 강제 종료·삭제 명령은 없다.
- 새 프로젝트 `incidentlens-rca-20261003`, 새 `mysql-data`/`kafka-data` 볼륨, loopback 포트 18000/18080/18081/18082를 사용했다. 원본 Compose와 기존 `.env`는 변경하지 않았다.
- 기존 `incidentlens` 컨테이너 12개의 ID와 마운트가 유지됐다. 실행 전에 이미 종료/재시작 중이던 기존 서비스는 복구하거나 중단하지 않았다.
- 새 control-plane 컨테이너의 키·모델 값이 모두 비어 있음을 값 출력 없이 확인했다. 유료 API 호출, 원격 push, PR, 배포는 하지 않았다.
- production 코드와 기존 미커밋 테스트·이전 결과 문서는 수정하지 않았다. 새 검증 문서/결과와 README의 후속 결과 안내만 추가한다. 이번 실행 검증으로 새 커밋을 만들거나 기존 미커밋 파일을 커밋하지 않는다.

## 정식 Gradle 결과

| 실행 | 실제 결과 |
| --- | --- |
| `./gradlew :apps:control-plane:test --no-daemon --rerun-tasks --tests 'io.incidentlens.control.RcaHttpTransportTest'` | 10개 통과, 실패/오류/skip 0. 테스트 suite 6.041초, Gradle 작업 37초 |
| `./gradlew test --no-daemon` | 78개 통과, 실패/오류/skip 0. control-plane 61, demo-api 7, demo-worker 4, common 6. Gradle 작업 1분 44초 |
| `./gradlew build --no-daemon` | 성공, 실행 가능한 세 backend JAR 생성. 24초. 테스트 task는 직전 성공 결과를 `UP-TO-DATE`로 재사용 |

78개에는 위 HTTP 10개가 포함된다. 합쳐서 88개의 서로 다른 테스트를 통과했다고 세지 않는다. 앞선 제한 환경의 **직접 JUnit 56개 통과**는 별도 기록이며 이번에 직접 JUnit을 재실행한 것은 아니다. `test`/`build`는 `integration` 태그를 제외한다. 기존 Testcontainers 15개를 이번에 재실행했다고 주장하지 않는다.

[`RcaHttpTransportTest`](../apps/control-plane/src/test/java/io/incidentlens/control/RcaHttpTransportTest.java)의 로컬 JDK HTTP/1.1 서버 검증:

| 시나리오 | 사례 수 | 확인한 동작 |
| --- | ---: | --- |
| 정상 응답 | 1 | 실제 HTTP 응답을 파싱하고 관측 증거 ID를 인용한 보고서 반환 |
| 정확히 65,536바이트 | 2 | Content-Length / chunked 응답 모두 허용 |
| 65,537바이트 선언 | 1 | 서버가 본문을 보내기 전에 거절 |
| chunked 누적 65,537바이트 | 1 | 수신 취소, 서버 측 연결 종료 감지 |
| HTTP 429 / 503 | 2 | 끝나지 않은 오류 본문을 계속 받지 않고 연결 종료 |
| 헤더 지연 / 본문 정지 | 2 | 테스트용 1초 제한으로 실패 처리, 서버 측 연결 종료 감지 |
| 실제 HTTP 정상 → 503 → 규칙 대체 → 저장/재조회 | 1 | H2에서 보고서 교체, 행 1개, fallback counter 1, 저장된 보고서 재조회 일치 |

연결 종료 assertion은 `server.stop()`보다 먼저 수행한다. 제한 시간 두 사례의 전체 테스트 시간은 각각 1.041초/1.037초였다. 이는 부하 벤치마크나 운영 20초 실측이 아니다. 운영 생성자는 20초를 유지하고 테스트에서 1초를 주입했다. 수신 상한은 응답 JSON 전체의 UTF-8 바이트이며 TCP 버퍼·파싱 객체를 포함한 프로세스 전체 메모리 상한을 뜻하지 않는다.

## 실제 화면 검증

**통과.** 검토한 `start-isolated.sh`가 종료 코드 0으로 완료됐고 7개 컨테이너가 모두 healthy다. 대시보드, control-plane health, Swagger 페이지도 각각 HTTP 200을 반환했다. 앱은 사용자가 확인할 수 있도록 실행 중으로 남겼다.

- 대시보드: **http://localhost:18000** (검증 브라우저에서는 `http://127.0.0.1:18000`).
- API 문서: **http://localhost:18080/swagger-ui/index.html**.
- 세션: **RCA 실제 실행 검증 2026-10-03**.
- 세션 ID: `23450503-8b75-4279-a560-79f4df807cc6`.
- 생성 시각: `2026-10-03T01:55:11.990945856Z` (한국 시간 10:55:11).

Chromium에서 API 응답 가로채기 없이 실제 React → nginx → Spring → MySQL 흐름을 사용했다.

1. **장애 실험실**에서 세션을 생성하고 그 세션에만 다운스트림 지연 400ms를 활성화했다.
2. 같은 세션의 BEFORE 헤더를 붙인 catalog HTTP 요청 10개가 모두 200을 반환했다. 부하/성능 비교 실험이 아니라 보고서에 넣을 관측값을 만드는 과정이다.
3. 화면의 **증거 수집**으로 31개를 수집하고 **RCA 생성**을 눌렀다. `rule-based` 보고서가 기존 증거 ID 6개를 인용했다.
4. 상세 API로 저장된 보고서가 생성 응답과 같은지 확인하고 장애를 비활성화했다.
5. 브라우저를 새로고침한 뒤 **증거 및 RCA**에서 같은 세션을 선택하고 **RCA 보고서 보기 ↓**로 이동했다. 보고서 전체 JSON, 생성 시각, 인용 ID가 같았다. 검증 중 보고서 생성 POST는 **1회**뿐이었다.
6. 별도 읽기 전용 MySQL 조회에서도 해당 세션의 `rca_report` 행 **1개**, provider `rule-based`를 확인했다. 마지막 활성 장애는 `null`, 화면 JS 오류와 HTTP 오류는 0개였다.

첫 브라우저 시도는 상단 긴급 해제와 장애 제어의 동명 버튼 두 개 때문에 검증 도구의 locator가 모호해 중단됐다. 해당 시도의 장애는 즉시 해제했다. `.fault-control`로 검증 선택 범위를 좁힌 뒤 **이미 생성한 같은 세션**에서 재검증했다. 앱 소스 수정은 필요 없었다. 실패 기록은 `artifacts/verification-20261003-docker/browser-attempt-1/`에 보존했다.

최초 WSL 캡처에는 한글 글꼴이 없어 네모가 보였다. 이미 설치된 Windows의 맑은 고딕을 ignored 로컬 fontconfig로 검증 브라우저에만 연결한 뒤, 새 브라우저에서 쓰기 요청 없이 같은 보고서를 다시 조회·캡처하고 이미지를 직접 확인했다. 시스템 글꼴 설치나 앱 CSS 변경은 없었다. 로컬 캡처는 `evidence-reloaded-ko.png`, `report-reloaded-ko-screen.png`, `report-reloaded-ko.png`다.

이 앱 화면은 **키가 없는 기본 규칙 경로**다. **외부 HTTP 오류 이후 대체 보고서 저장**은 앞의 실제 HTTP + H2 테스트로 별도 확인했다. 화면에 `rule-based`가 보인다는 이유로 외부 오류를 유발했다고 주장하지 않는다. 브라우저 새로고침을 검증했으며 DB/서비스 재시작 복구 테스트는 아니다.

사용자가 지금 확인할 순서:

1. 대시보드 → **증거 및 RCA** → **RCA 실제 실행 검증 2026-10-03** 선택.
2. **RCA 보고서 보기 ↓** → 생성 시각, 근거 링크, 권장 조치와 불확실성 확인.
3. 브라우저 새로고침 → 같은 메뉴/세션 → 보고서 확인. **RCA 생성**을 다시 누르지 않아도 조회된다.
4. 새 보고서 생성 흐름을 직접 확인하려면 **장애 실험실**에서 새 세션을 만든 뒤 **증거 수집 → RCA 생성**을 누른다. 새 트래픽이 없으면 근거 부족 보고서가 정상이다.

검증용 상태와 정식 테스트 재실행 명령:

```bash
cd /home/mireu/Dev/incident-lens-career-20261002
docker ps --filter label=com.docker.compose.project=incidentlens-rca-20261003
./gradlew :apps:control-plane:test --no-daemon --rerun-tasks \
  --tests 'io.incidentlens.control.RcaHttpTransportTest'
./gradlew test --no-daemon
./gradlew build --no-daemon
```

`start-isolated.sh`는 이미 존재하는 검증 스택을 발견하면 보호를 위해 중단한다. 지금은 다시 실행할 필요가 없다. 기본 `dev-up`으로 기존 `incidentlens` 스택을 갱신하지 않는다.

## 전후 차이와 핵심 코드

이전에는 외부 응답을 전부 문자열로 받은 뒤 크기를 검사했다. 개선 후에는 응답을 조금씩 받으면서 바이트 수를 확인해, 너무 크거나 오류 상태이면 수신을 중단한다. 응답 본문이 끝나기를 무한히 기다리지 않도록 제한 시간을 두고 취소를 요청한다. 외부 분석이 실패해도 관측값을 이용한 규칙 보고서를 저장하고 다시 볼 수 있는 기존 사용자 흐름은 유지한다.

다음 세 곳을 순서대로 읽으면 전체 흐름에서 세부 구현으로 내려갈 수 있다.

1. [`RcaService.generate/get`](../apps/control-plane/src/main/java/io/incidentlens/control/RcaService.java): 증거 선택 → 분석/규칙 대체 → 검증 → SQL 저장 → 저장된 보고서 조회.
2. [`OpenAiCompatibleRcaProvider.analyze/receive`](../apps/control-plane/src/main/java/io/incidentlens/control/OpenAiCompatibleRcaProvider.java): HTTP 요청, 응답 완료 대기, 시간 초과/인터럽트 취소, 응답 형식과 인용 검증.
3. [`RcaResponseBody.onSubscribe/onNext`](../apps/control-plane/src/main/java/io/incidentlens/control/RcaResponseBody.java): 오류 헤더 조기 거절, 실제 수신 바이트 누적 검사, 초과 데이터를 복사하기 전 구독 취소.

면접 설명: **문제**는 응답을 다 받은 후 검사하면 큰 응답의 자원 사용을 막지 못한다는 점이었다. **판단**은 새 프레임워크보다 기존 JDK HTTP 구독 처리에 제한을 적용하는 것이었다. **구현**은 수신량 검사와 완료 대기 제한을 나누고, 실패는 기존 규칙 대체·저장 흐름으로 연결했다. **검증**은 모의 전송뿐 아니라 실제 HTTP 경계·취소·저장 테스트와 별도 MySQL 앱 화면에서 확인했다. 정량적인 메모리 절감·모델 비용 절감·응답 품질 향상은 측정하지 않았다.

## 증거와 남은 범위

- 기계 판독 요약: [실행 결과 JSON](results/rca-live-verification-2026-10-03.json).
- 원본 로그/XML/화면/검증 도구: ignored `artifacts/verification-20261003-docker/`. `gradle-http.log`, `http-tests.xml`, `gradle-test.log`, `gradle-build.log`, `start-isolated.log`, `browser-result.json`, `verify-live.mjs`를 확인한다.
- 이번 검증은 RCA 개선에 한정한다. HTTP/2, 실제 유료 모델, 전체 Testcontainers suite, 네 가지 전체 BEFORE/AFTER 실험, observability profile은 이번에 검증하지 않았다.
- Gradle의 차기 9.0 호환 경고와 Flyway의 MySQL 8.4 지원 버전 경고는 남아 있다. 이번 빌드와 새 DB 마이그레이션을 실패시키지는 않았으며 의존성 업그레이드로 범위를 넓히지 않았다.
- [앞선 환경 제한 기록](RCA_HTTP_VERIFICATION_2026-10-03.md)과 [구현 및 직접 JUnit 기록](RCA_RESPONSE_BUDGET.md)은 각각 당시의 결과로 보존한다. 이번 결과가 과거 제출 이력서의 주장이나 운영 성과를 소급해 증명하지는 않는다.
