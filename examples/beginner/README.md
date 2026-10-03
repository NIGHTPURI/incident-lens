# Beginner examples / 기초 예제

These examples evolve one product-total calculation from text, to Java, to HTTP,
to Spring. They do not need the IncidentLens database, Redis, Kafka or Docker.
They are teaching examples, not production services. Full Korean/English lessons
and expected outputs are in the learning workspace.

상품 합계 계산 하나를 텍스트 → Java → HTTP → Spring 순서로 확장합니다.
기존 IncidentLens 서비스나 데이터를 수정하지 않습니다. 한·영 설명과 과제는 학습 UI에 있습니다.

Run from the repository root / 저장소 루트에서 실행:

```sh
cat examples/beginner/product.txt
java examples/beginner/java/Basics.java
java examples/beginner/java/Totals.java
java examples/beginner/java/Catalog.java
java examples/beginner/java/ParseQuantity.java two
```

Java 21 source-file execution requires no build tool. Check `java -version` first.
Java 21이 없으면 자동 설치하지 말고 준비가 필요한 항목으로 기록하세요.

```sh
# Terminal 1 / 터미널 1: leave running; stop your example with Ctrl+C.
java examples/beginner/http/TinyServer.java
# Terminal 2 / 터미널 2:
curl -i 'http://127.0.0.1:18181/total?quantity=2'
```

Expected / 예상: HTTP 200, `{"total":2400}`. Unknown paths give 404, unsupported
methods 405, missing/malformed/out-of-range quantities 400. The teaching server
accepts only the simple `quantity=NUMBER` query, not a general query-string grammar.
이 장난감 서버는 단순 수량 쿼리만 처리합니다. 일반적인 URL 파서를 구현한 예제가 아닙니다.

```sh
./gradlew -p examples/beginner/spring-api --offline --no-daemon test
./gradlew -p examples/beginner/spring-api --offline --no-daemon run
curl -i 'http://127.0.0.1:18182/total?quantity=2'
```

The Spring build is independent of the root multi-service build. It reuses the
existing wrapper/caches. Offline dependency failure means setup is incomplete;
do not automatically download dependencies, build Docker images or delete caches.
Spring 빌드는 독립적이며 캐시가 없으면 실패할 수 있습니다. 다운로드나 정리는 별도 작업입니다.

Check ports before starting. Never stop another service to free a port.
실행 전 포트를 확인하고 다른 서비스를 종료하지 마세요.

```sh
python3 examples/beginner/verify.py
```

This checks seven Java outputs and eight real HTTP cases. It refuses an occupied
18181 port, starts only its own toy server, and stops that process in a finally
block. Its POST case verifies 405 against the toy server; it never sends API
mutations to IncidentLens. Spring tests use MockMvc (no listening HTTP port).
검증 스크립트는 자신이 시작한 예제만 종료합니다. 실제 IncidentLens 실험은 실행하지 않습니다.

## Stages 5–15 / 5–15단계

```sh
python3 examples/beginner/advanced/run.py 5
python3 examples/beginner/advanced/run.py all
./gradlew -p examples/beginner/data-jpa --offline --no-daemon test
```

The Python helper only chooses a Java source and a previously cached H2 jar. It
does not install anything or connect to IncidentLens. Missing H2 blocks execution
with a clear message; reading the lesson remains available. Each Java program is
bounded and self-checks its observable results. Stage 5 creates a small uniquely
named temporary H2 file to demonstrate close/reopen persistence; the other SQL
examples use isolated in-memory databases. The helper never deletes user files.

Python 도우미는 Java 소스와 기존 H2 캐시만 선택합니다. 기존 DB 접속·설치·다운로드가
없습니다. 5단계는 고유 임시 파일로 영속성을 보여주며 나머지 SQL은 메모리 DB입니다.
H2 검증은 MySQL 호환성이나 운영 성능 검증을 대신하지 않습니다.

| Stage | Executed check / 실행 검사 | Explicit limit / 한계 |
|---|---|---|
| 5 | H2 CRUD, FK, JOIN, file reopen | No MySQL server |
| 6 | JDBC commit/rollback; separate actual JPA N+1/fetch-join/page tests | H2, not MySQL isolation |
| 7 | PBKDF2 correct/wrong password, bound SQL; owner/CSRF policy models | No browser login, TLS or CORS integration |
| 8 | Same contract rejects buggy validation and accepts corrected behavior | Small calculator boundary |
| 9 | Typed response-contract model | No remote CI, PR, push or deployment |
| 10 | Config/readiness/schema/rollback decision model | No container or routing changes |
| 11 | Mean/nearest-rank p95/missing-data checks | Synthetic timings/log/trace; no load benchmark |
| 12 | Actual H2 index plan; controlled-clock cache hit/staleness/TTL/invalidation | Map model, no Redis server |
| 13 | Actual threads, lost update/atomic increment, H2 version check | Process-local idempotency, no distributed guarantee |
| 14 | Actual H2 outbox/effect transactions; bounded queue/retry/DLQ model | No Kafka broker/network failure/reassignment |
| 15 | Sequential H2 owner/retry/conflict/stock/outbox invariants; bounded report-validation model | Learner must integrate HTTP/auth/concurrent retry; no LLM call |

Expected result lines begin PASS, RED/GREEN, MODEL or SYNTHETIC as appropriate.
Read the full lines: a passing model is not verification of the corresponding
production system. Concrete commands, expected values, failures and independent
exercises are in the bilingual learning UI.

출력의 PASS와 MODEL/SYNTHETIC 범위를 함께 읽으세요. 모형 통과를 실제 Kafka·Redis·배포·
LLM 검증으로 기록하지 않습니다. 독립 과제 결과는 예제 실행과 별도로 기록합니다.

### JPA query-count exercise / JPA 쿼리 수 실습

`data-jpa` is an independent test-only Gradle project. It uses the same cached
Spring Boot dependency BOM as the application. Three categories/products are
persisted, then the persistence context and statistics are cleared. Traversing
lazy category names emits four SQL statements; a targeted fetch join emits one.
Pagination verifies two then one row with a stable ID ordering and total three.
`create-drop` applies only to the automatically configured isolated H2 test DB.

data-jpa는 독립 테스트 프로젝트입니다. 준비 데이터의 1차 캐시를 비운 뒤 실제 Hibernate
SQL 수를 검사합니다. 기존 애플리케이션 DB의 스키마를 변경하지 않습니다.

### Independent capstone / 독립 프로젝트

The runnable stage-15 reference deliberately states its sequential scope. Do not
copy it as production order processing. Use the lesson acceptance table to build
and review your own HTTP adapter, owner-scoped reads, persistent idempotency and
concurrent uniqueness-conflict recovery. Keep authorization fixtures labeled as
fixtures until real authentication is integrated and tested. Kafka and provider
work remain optional isolated extensions; never claim an unrun integration passed.

15단계 참고 구현은 순차 Service 검증이며 운영 주문 시스템이 아닙니다. HTTP 어댑터,
소유자 조회, 동시 중복키 회복은 학습자가 독립 구현하고 검증할 과제입니다. 이것은 수업
누락이 아니라 숙련을 확인할 과제이며 참고 실행과 독립 수행을 별도 기록합니다.
