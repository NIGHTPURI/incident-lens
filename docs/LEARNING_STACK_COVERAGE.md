# IncidentLens learning stack coverage

This checklist maps the actual local lab stack to the new in-app **Technology guides**. A guide is explanatory; it does not imply that the optional service is running or that a lesson's model executed that service. Java remains the real experiment backend. The four other programming-language paths are learning content, not alternative lab implementations.

| Actual component | Compose/runtime status | Technology guide | Existing Java lesson / boundary |
| --- | --- | --- | --- |
| Java, Spring Boot, Gradle-built control-plane, demo-api, demo-worker | Core | Java · Spring Boot | Stage 04 small Spring example; real lab has three services |
| control-plane, demo-api, demo-worker, transactional outbox | Core | control-plane · API · worker · outbox | Stages 06/14; 201 acceptance differs from fulfillment |
| MySQL, Flyway migrations, JPA/JDBC persistence | Core | MySQL | Stages 05/06 use isolated H2 for parts; not proof of MySQL locking |
| Redis catalog cache and expiring fault state | Core | Redis | Stage 12 cache model is Java Map; actual lab cache/fault keys are Redis |
| Kafka order topic, consumer group and DLQ | Core | Apache Kafka | Stage 14 broker behavior is modeled locally; actual lab uses Kafka |
| Docker and Compose | Core runner | Docker · Compose | Stage 10; named volumes, health checks and profiles |
| React UI, Vite dev preview, Nginx container static serving and /api proxy | Core UI; Vite is dev-only | React · Vite · Nginx | Stage 01 UI/port concepts; learning language does not alter experiment backend |
| k6 scripts in loadtest/ | Optional `loadtest` profile; terminal initiated | k6 | Stage 11 measurement concepts; browser never starts k6 |
| Prometheus scraping three Actuator endpoints | Optional `observability` profile | Prometheus | Stage 11; direct incident evidence works without Prometheus |
| Grafana provisioned dashboard/data sources | Optional `observability` profile | Grafana | Stage 11; queries/visualizes sources, does not collect/store the signals |
| OpenTelemetry Java agent and Collector | Optional `observability` profile; SDK disabled by default | OpenTelemetry · Collector | Stage 11; traces can be absent; metrics scrape bypasses Collector |
| Loki | Optional `observability` profile | Loki | Stage 11; stores logs through Collector pipeline |
| Tempo | Optional `observability` profile | Tempo | Stage 11; stores traces through Collector pipeline |
| RCA provider configuration | Optional, only with explicit provider config | RCA · optional LLM provider | Stage 11/15 evidence reasoning; no provider call from guides |

The catalog groups supporting libraries with their user-facing boundary: Micrometer/Actuator under Prometheus; Flyway/JPA/JDBC under MySQL and Java/Spring; Nginx under the UI guide. It is a learning map of the lab, not an inventory of every transitive package. Separate deep lessons for these supporting libraries and complete runnable projects for Python, JavaScript/TypeScript, Go and C# remain future work. Current non-Java paths provide five progressive lessons each with focused code, flow, failure diagnosis and practice; snippets are explicitly unverified and omit required project/dependency/DB/security setup.

Evidence for this mapping: `docker-compose.yml`, `apps/web/Dockerfile`, `apps/web/nginx.conf`, `infra/prometheus/prometheus.yml`, `infra/otel/collector.yml`, `infra/grafana/provisioning/datasources/datasources.yml`, `ARCHITECTURE.md`, `docs/DEMO_BACKEND.md`, `README.md`.
