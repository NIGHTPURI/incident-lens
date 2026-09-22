# AI-assisted engineering record

This repository was created with AI coding assistance. It should not be presented as unaided work or as a production system operated by its owner. The repository owner should run it, inspect the failure reasoning, and record their own review before using it in an interview.

## Work delegated during this session

The primary agent designed contracts and implemented the control plane, evidence/RCA and experiment lifecycle. Parallel coding agents implemented the demo API/worker/common module, the React dashboard, and Compose/observability/load scripts/CI. The dashboard agent independently reviewed control-plane contracts and validation. All shared-file ownership was explicit to reduce conflicting edits.

## Decisions requiring the owner's review

- Service boundaries and whether eventual fulfillment fits the business action.
- SQL locking/upsert semantics, transaction participation and duplicate handling.
- Outbox lease timeout versus producer delivery timeout and ambiguous acknowledgements.
- Fault ownership/expiry, Redis/audit consistency gap, and experiment scope integrity.
- Evidence thresholds, provenance and the limits of citation validation.
- Laptop defaults, local-only credentials/access, cloud cost tradeoffs and retention.

These decisions were reviewed by the coding agents and exercised by tests where stated. **No human architectural sign-off is claimed.**

## Corrections made during actual implementation/review

| Finding | Correction / validation |
|---|---|
| MySQL cannot reopen the same temporary seed table through repeated references in one query | Reworked catalog seeding to a compatible deterministic query; exercised through Flyway in MySQL tests |
| Duplicate worker INSERT IGNORE followed by lock upgrade could deadlock concurrent deliveries | Replaced with an exclusive no-op upsert and a delivery token; tests cover duplicate concurrency |
| Jackson primitive DTO fields accepted missing fault values as false and absent performance metrics as 0 | Required boxed fields with `@NotNull`; HTTP tests reject incomplete fault commands and incomplete summaries |
| A previously used session/phase could contaminate a new experiment's cumulative telemetry | Run start checks that the selected phase has no prior request/processing observations |
| Existing report citations could disappear from a latest 500 evidence list | Detail responses retain the report's cited rows in addition to recent evidence |
| Optional LLM could assign confidence to zero-traffic evidence | Validator now requires observed traffic and a cited symptom for positive confidence; local provider test rejects empty-scope hypotheses |
| Initial frontend test-tool version had reported dependency advisories | Updated the toolchain and reran audit, build and tests |
| k6 graceful-stop setting was placed outside its scenario | Corrected the workload options and ran the actual k6 binary against a local protocol fixture |
| PowerShell native-command output contaminated a returned summary object | Routed progress output correctly; tested the comparison protocol and failure cleanup |
| Failed AFTER runs did not initially trigger cleanup | Added run-active tracking so cleanup aborts either active phase |
| Actual local runs accumulated unpublished outbox rows even when Kafka lag was low | Added an evidence-cited producer-backlog hypothesis and a regression test; backlog snapshots are framed as competing explanations rather than proof of an increasing queue |
| Live populated Overview overflowed the mobile viewport although comparison tests passed | Contained the accessible table header within its scroll region and extended browser checks to the populated Overview |
| A PowerShell test double left a nonzero native exit code after an expected failure | Restored the prior exit code and verified the exact GitHub Actions shell exit behavior |

These are examples of why generated code needs executable checks and independent review. They are not invented production incidents.

## Review checklist

- [ ] Personally run the complete verification script on Windows/Docker Desktop.
- [ ] Trace one accepted order from HTTP through SQL/outbox/Kafka/worker.
- [ ] Explain the crash-after-publish duplicate window without using "exactly once" loosely.
- [ ] Read all Flyway constraints and the concurrency tests.
- [ ] Confirm fault commands and lifecycle transitions match actual Redis state.
- [ ] Compare measured results with the workload metadata and known confounders.
- [ ] Verify every RCA citation resolves, and challenge unsupported semantic claims.
- [ ] Inspect dependency updates, ignored files, environment defaults and exposed ports.
- [ ] Read and adapt the interview guide in your own words.

Unchecked boxes indicate owner follow-up, not missing hidden automated results.

## Validation evidence

`SESSION_STATE.md` lists commands actually run and their results. Gradle XML/HTML reports, browser tests and saved experiment summaries provide machine-readable evidence. Tests use no paid provider; an HTTP stub exercises valid/invalid compatible responses. Observability and measurements should only be called validated after their real services were inspected.

## Owner continuation log

| Date | Change personally reviewed | Command/evidence | Decision/tradeoff |
|---|---|---|---|
| _Fill after your own review_ | | | |

Additional review corrections: strict JSON type checks now reject scalar coercion, null confidence, duplicate keys and trailing model JSON. A scheduled database reconciliation marks expired run leases ABORTED so a crashed runner does not leave a permanently misleading RUNNING record.

Real-engine verification also exposed a UTC mismatch in the control-plane test fixture: the host JVM used Asia/Seoul while Hibernate used UTC, but the Testcontainer connection initially used its local-zone default. Aligning the connection/session timezone with the Compose UTC configuration fixed the lease-expiration check. Test teardown uses Spring's context lifecycle and removes cached application contexts; directly closing a cached context was rejected after it caused a Spring test callback failure.
