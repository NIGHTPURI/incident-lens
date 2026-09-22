# Implementation references

Primary references consulted during implementation; these describe platform behavior, not evidence that this project ran successfully.

- [Spring Boot 3.5 system requirements](https://docs.spring.io/spring-boot/3.5/system-requirements.html): Java/Gradle compatibility. Build pins Java 21, Spring Boot 3.5.16 and Gradle 8.14.3.
- [Spring Kafka error handling](https://docs.spring.io/spring-kafka/reference/kafka/annotation-error-handling.html): bounded retries and DeadLetterPublishingRecoverer. The worker explicitly fails recovery if DLQ publication fails.
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs): JSON mode alone does not enforce a schema. The optional compatible provider uses JSON mode for portability, then validates required fields, bounds and known evidence IDs locally. New native OpenAI applications can prefer strict structured outputs; this adapter intentionally supports compatible servers too.
- [OpenTelemetry Java automatic instrumentation](https://opentelemetry.io/docs/zero-code/java/agent/): instrumentation of Spring HTTP, JDBC, Redis and Kafka through the pinned Java agent. The outbox explicitly persists/restores W3C trace context across the database boundary.

No API key or paid model call was used for verification. Local HTTP stub tests exercise the optional provider's wire format and failure behavior.
