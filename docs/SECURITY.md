# Local security and configuration boundaries

IncidentLens intentionally has no user/tenant authentication. Compose publishes only loopback ports, and MySQL/Redis/Kafka remain internal. The control API can deliberately degrade workloads; it must not be exposed publicly. Nginx is a reverse proxy, not an authorization boundary.

Configuration is environment-driven. `.env.example` contains clearly local defaults; `.env` and artifacts are ignored. Changing MySQL credentials after initialization requires a deliberate credential migration or disposable volume reset. No LLM key is committed or required. Provider response bodies and credentials are excluded from application error logs.

Requests use bean validation, parameterized SQL, bounded/sanitized identifiers and a 32 KiB JSON body filter. Both fixed-length and chunked JSON are bounded. Safe problem responses avoid stack traces or database details. Native DTO validation rejects absent fields instead of inventing zero-valued measurements. Metrics avoid per-incident labels to bound cardinality.

Fault ownership is atomic in Redis and activation expires after 900 seconds. Fault lookup failure disables injection. A SQL audit gap is still possible around a process crash; this is documented, not hidden as a fully transactional control system.

Before any deployment beyond a private lab: implement operator authentication and authorization, origin/CSRF strategy for browser credentials, TLS, separate service grants, network policy, secrets rotation, retention, rate limits, image scanning and explicit approvals for production fault actions. These are deployment requirements, not features claimed by this local demo.

Dependency hygiene: pinned Java/Node/Gradle/image versions, lockfile for npm, checksum for Gradle distribution and OTel agent, frontend dependency audit and CI builds. Pinned tags are not immutable image digests. No blanket claim of zero vulnerabilities across all transitive Java/container dependencies is made.
