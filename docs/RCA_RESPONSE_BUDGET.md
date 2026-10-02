# RCA 외부 응답 예산 개선 (2026-10-02)

이 문서는 제출본 이후의 코드 개선 기록이다. 최종 제출 이력서·포트폴리오를 이 환경에서 확보하지 못했으므로 제출 당시의 경험이나 성과를 재구성하지 않는다.

## 구현 전에 정한 문제와 완료 기준

- 기준: `NIGHTPURI/incident-lens`, `main`, `77bcb483e8aa419703b990dcfb95b02bb8af059f`. GitHub 원격과 로컬 `nice`의 HEAD가 일치했다.
- 문제: `OpenAiCompatibleRcaProvider.analyze`는 `BodyHandlers.ofString()`으로 전체 응답을 메모리에 받은 다음 `body().length() > 65536`을 검사했다. 큰 응답을 최종 거절해도 **수신 중 메모리 사용을 제한하지 못한다**. UTF-16 문자 수와 전송 바이트 수도 다르다. 오류 상태의 본문도 모두 읽었다.
- 범위: 이 provider의 응답 수신 경계와 `RcaService.generate`의 기존 폴백 흐름만 보강한다. UI·DB 스키마·프롬프트·인프라는 유지한다.
- 완료 기준: 65,536 바이트까지 허용하고 초과 데이터는 누적 전에 중단, Content-Length가 없거나 부정확해도 실제 수신량 검사, 오류 HTTP 상태는 본문 수집 전 거절, 본문 완료 대기 20초 후 취소 요청, 인터럽트 보존, 정상 응답·인용 검증·규칙 기반 폴백 저장 회귀 확인.
- 검증: 수신 구독자에 청크를 직접 전달해 경계를 확인하고, 가짜 HTTP client/future로 시간 초과·외부 실패와 저장 흐름을 검증한다. 기존 로컬 HTTP server 테스트는 보존한다. 실제 유료 모델 호출은 하지 않는다.

## 선택과 대안

기능 확장보다 실제 버그 수정과 작은 책임 분리가 더 가치 있다. 기존 서비스는 증거 수집, 출처 검증, 규칙 기반 대체 보고서를 갖췄으므로 실패한 AI 응답이 그 흐름을 막지 않게 하는 것이 목표다.

| 대안 | 판단 |
| --- | --- |
| 전체 수신 후 검사 유지 | 메모리에 이미 큰 본문을 보관한 뒤여서 문제를 해결하지 못함 |
| Content-Length만 검사 | 청크 전송이나 잘못된 길이 선언에 대응하지 못함 |
| InputStream으로 바꿔 제한만큼 읽기 | 크기는 제한할 수 있으나 읽기 중 정지·취소·수명 관리가 추가로 필요 |
| JDK BodySubscriber에서 실제 바이트 계수 + 완료 future의 시간 제한 | 기존 JDK HTTP client를 유지하면서 수신 단계에서 중단 가능. 추가 라이브러리 불필요. 선택 |

BodySubscriber는 HTTP 본문이 조금씩 도착할 때 받는 객체다. `cancel`은 더 받지 않겠다는 요청이고, `future`는 작업의 완료/실패를 담는 객체다. 취소는 제공자 측 생성 중단이나 과금 취소를 보장하지 않는다.

설계 계약 참고: [JDK 21 BodySubscriber](https://docs.oracle.com/en/java/javase/21/docs/api/java.net.http/java/net/http/HttpResponse.BodySubscriber.html), [JDK 21 HttpClient](https://docs.oracle.com/en/java/javase/21/docs/api/java.net.http/java/net/http/HttpClient.html). 테스트는 계약 수준의 모의 검증과 실제 네트워크 검증을 구분한다.

## 구현

- [`RcaResponseBody`](../apps/control-plane/src/main/java/io/incidentlens/control/RcaResponseBody.java): HTTP 상태와 길이 헤더를 확인한 뒤 한 묶음씩 본문을 요청한다. `onNext`에서 묶음 전체의 남은 바이트 수를 먼저 합산하고, 누적량과 합이 상한을 넘으면 복사 전에 구독을 취소하고 실패로 완료한다. 외부 버퍼를 보관하지 않고 허용된 데이터만 복사한다. 수신이 끝난 뒤 UTF-8로 해석하므로 한글/이모지가 청크 경계에서 끊겨도 원문을 복원한다.
- [`OpenAiCompatibleRcaProvider.receive`](../apps/control-plane/src/main/java/io/incidentlens/control/OpenAiCompatibleRcaProvider.java): `sendAsync`가 돌려준 future를 본문 완료까지 최대 20초 기다린다. 시간 초과/인터럽트 시 취소를 요청한다. 운영 생성자의 연결 제한 3초를 유지하고, 패키지 내부 생성자로 테스트에서 HTTP client와 짧은 제한 시간을 주입한다. `@Autowired`는 Spring이 사용할 생성자를 명시한다.
- [`RcaService.generate`](../apps/control-plane/src/main/java/io/incidentlens/control/RcaService.java): 기존 동작을 그대로 재사용한다. 외부 실패 → 규칙 보고서 생성 → 인용/스키마 검증 → 저장. `incidentlens.rca.fallback` 카운터와 `provider=rule-based`로 대체 여부를 확인할 수 있다. 오류 원문·URL·키는 API 예외에 붙이지 않는다.

시간 복잡도는 수신한 허용 데이터 B에 대해 O(B), 본문 누적 공간은 O(min(B, 65,536))이다. 문자열·파싱 객체·일시적인 복사본과 JDK 네트워크 버퍼는 별도로 존재하므로 **전체 프로세스 메모리가 64 KiB라는 뜻은 아니다**. 정확한 힙 절감량/처리량은 측정하지 않았다.

## 실제 검증 결과

JDK 21.0.12.1, Linux/WSL 환경에서 확인했다. Gradle은 소켓/IP 관련 환경 제약으로 작업 실행 전 실패했다. 이미 설치된 Gradle 캐시의 JAR을 읽어 `javac`와 JUnit Platform Launcher로 직접 컴파일·실행했다. 이 검증은 Gradle 빌드 성공을 대신 주장하지 않는다. 캐시 버전 목록, 선택한 테스트 목록, 출력은 로컬 `career-review-20261002/`에 보관했다.

| 검증 | 결과 | 의미 |
| --- | --- | --- |
| 변경 전 기존 Java 테스트 중 소켓/외부 인프라 불필요한 8개 클래스 | 23/23 통과 | 기존 동작 기준 |
| 기존 수신 방식의 JDK 구독자에 65,537바이트 전달 | 취소 false, 실패 false, 완료 후 65,537자 누적 | 전체 수신 후 검사가 수신 중 상한이 아님을 재현 |
| 변경 후 Java 11개 테스트 클래스 | 56/56 통과 | 기존 23 + 신규 33개 사례 |
| `RcaResponseBodyTest` | 상한 정확히 허용, +1 거절, 헤더 부재/작은 허위 값, 묶음 초과, 한글 바이트 수, UTF-8 분할, 302/400/429/503, 중간 오류 통과 | 실제 네트워크 대신 Flow 구독자 계약 검증 |
| `RcaProviderBoundaryTest` | 정상 JSON, 정확한 상한의 응답, 잘못된 인용/타입/중복 필드/여분 필드/잘림, 증거 없는 확신, 입력 초과, 시간 초과·인터럽트·통신 실패·폴백 통과 | 가짜 HTTP client가 실제 새 수신기를 구동. 테스트 시간 제한은 100ms |
| `RcaReportFlowTest` | 정상 생성 → 과대 응답 → 대체 보고서 저장 → 상세 조회, 보고서 행 1개/근거 유지/폴백 카운터 1 확인 | 실제 컨트롤러·서비스·JDBC와 메모리 H2, 모의 HTTP·세션 repository |
| 프런트엔드 기존 테스트 | 5개 파일, 33/33 통과 | UI 회귀 검증; UI 수정 없음 |
| `npm --prefix apps/web run build` | 성공 | TypeScript 검사와 Vite production build |
| 소스 전체 컴파일 | production 50개, test 18개 파일 성공 | 미실행 네트워크/인프라 테스트도 컴파일 포함 |

새 테스트 작성 중 정적 import 누락과 H2 fixture의 enum 직접 바인딩 실패를 수정했다. 후자는 실제 JPA의 문자열 enum 매핑과 맞도록 `.name()`으로 고쳤다. 모두 이번 테스트 준비 과정의 실패였고, 기존 테스트 실패로 분류하지 않는다. `TelemetryClient`의 deprecated API 컴파일 경고는 기존 코드에서 발생하며 이번 범위 밖이다.

미실행: Gradle `test`/`build`, 실제 소켓을 여는 기존 HTTP 테스트 4개 클래스, Docker/MySQL/Redis/Kafka 테스트 3개 클래스, 브라우저 E2E, 실모델 호출. 로컬 소켓 생성도 `Operation not permitted`였으므로 권한 변경이나 우회는 하지 않았다. H2는 MySQL 엔진의 잠금·동시성·Flyway 호환성을 증명하지 않는다. 이번 코드의 실제 HTTP/1.1·HTTP/2 전송 취소 효과도 모의 검증과 구분한다.

기계가 읽을 수 있는 결과 요약: [JSON 기록](results/rca-response-budget-2026-10-02.json).

## 전후 차이와 한계

| 항목 | 이전 | 이번 변경 |
| --- | --- | --- |
| 크기 검사 시점 | 전체 응답을 String으로 받은 뒤 | 수신 청크를 누적하기 전 |
| 상한 단위 | 65,536 UTF-16 code units | 65,536 응답 바이트, JSON envelope 포함 |
| 오류 응답 | 본문 전체를 읽은 뒤 상태 검사 | 상태 확인 후 본문 요청 없이 취소 |
| 시간 제한 | `HttpRequest.timeout(20초)` | 기존 request timeout + 본문 완료 future 대기 20초/취소 경로 검증 |
| 실패 후 사용자 흐름 | 규칙 기반 폴백이 존재 | 새 실패 경로에서도 생성·저장·다시 조회됨을 검증 |

호환성 변화: 한글 등 멀티바이트 문자는 이전 문자 수 검사보다 일찍 상한에 도달할 수 있다. 응답을 잘라서 정상 JSON인 척하지 않고, 전체를 거절한 뒤 기존 규칙으로 대체한다. 64 KiB는 기존 65,536이라는 제한을 실제 수신 예산으로 명확히 한 정책값이며 최적값을 벤치마크로 증명한 것은 아니다.

취소는 제공자 쪽 추론 완료/비용 취소를 보장하지 않는다. 입력 증거는 기존 100,000 UTF-16 code units 제한을 유지하며 토큰 예산/출력 토큰 제한은 별도다. 시간 예산은 HTTP 완료 대기 범위이고 DB 조회·JSON 직렬화·전체 API 요청의 SLA가 아니다. 동시 요청 수 제한이나 회로 차단기는 추가하지 않았다. 폴백 횟수는 알 수 있으나 상세 실패 사유별 지표는 없다.

다음 후보는 실제 네트워크에서 느린 청크/연결 종료/HTTP2 취소 검증, 대표 장애 증거로 답변 품질 평가, 입력·출력 토큰 예산 검토다. 비용·품질 개선률과 실제 운영 장애 예방 성과를 주장할 근거는 아직 없다.

## 재실행

이 작업 공간에서 이미 확인한 소켓 없는 검증을 반복하려면:

```bash
python3 /home/mireu/Dev/career-review-20261002/run_java_tests.py \
  /home/mireu/Dev/incident-lens-career-20261002 incident-recheck
```

위 보조 스크립트는 이 머신의 캐시에 의존하는 감사용 파일이며 저장소의 표준 빌드 도구가 아니다. 정상 로컬 환경의 표준 명령은 다음과 같다. 테스트는 유료 모델을 부르지 않는다.

```bash
./gradlew :apps:control-plane:test --no-daemon \
  --tests '*RcaResponseBodyTest' --tests '*RcaProviderBoundaryTest' --tests '*RcaReportFlowTest'
./gradlew test --no-daemon
npm --prefix apps/web test -- --run
npm --prefix apps/web run build
```

Docker가 있는 환경에서는 기존 `bash scripts/verify.sh --integration`으로 전체 인프라까지 확인한다. 이 명령은 이번 작업에서 통과한 것으로 기록하지 않는다. 화면은 기존 Incident Lab의 RCA 결과에서 provider와 evidence citations를 보면 된다. 이번에 화면을 바꾸거나 새 화면 캡처를 만들지는 않았다.

## 면접에서 설명하기

**문제 → 판단 → 구현 → 검증:** “외부 AI 응답을 전체 수신한 다음 길이를 검사하는 코드를 발견했습니다. 그러면 큰 응답을 거절하더라도 이미 메모리를 사용합니다. Content-Length만 신뢰할 수도 없어 실제 수신 바이트를 계산하는 JDK 구독자를 추가했습니다. 초과 청크를 복사하기 전에 취소하고, 본문 완료를 기다리는 시간도 제한했습니다. 정상 분석과 기존 인용 검증은 유지했고, 외부 실패 시 규칙 보고서를 저장해 다시 조회하는 흐름을 H2와 모의 HTTP로 확인했습니다. 기존 23개와 새 33개, 총 56개 테스트가 통과했지만 실제 모델 품질·과금·실소켓 취소 효과를 검증했다고 말하지는 않습니다.”

- 왜 별도 수신기인가? JSON의 내용 검증과 네트워크에서 받은 데이터량 제한은 서로 다른 책임이다. provider에 재시도 프레임워크를 추가할 필요가 없다.
- 왜 재시도하지 않았나? 너무 크거나 잘못된 응답은 재시도가 해결한다는 근거가 없고, 지연·중복 비용을 늘릴 수 있다. 기존 한 번 호출 후 규칙 대체를 유지했다.
- 폴백이 정확한 답을 보장하나? 아니다. 관측 증거 기반의 제한된 규칙이며 불확실성을 표시한다. 인용 ID의 존재 검증도 문장의 의미적 진실을 증명하지 못한다.
- 왜 H2 테스트인가? 이 환경에서 파일 DB나 서버를 건드리지 않고 저장·조회 계약을 검증할 수 있다. MySQL 동시성 검증과는 구별한다.
- 본인이 한 일이라고 어떻게 말하나? 이번 변경은 AI 도구와 함께 수행했다. 코드를 읽고 재실행한 뒤 본인이 이해한 판단·검증 범위만 설명한다. 기존 [AI engineering 기록](AI_ENGINEERING.md)의 인간 검토 미완료 표기도 유지했다.
