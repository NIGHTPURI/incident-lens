# RCA BEFORE evidence boundary

RCA previously called the general evidence list (latest 500 across phases) and then excluded AFTER. With two BEFORE rows and 501 newer AFTER rows, its evidence package became empty.

`EvidenceCollector.listForRca` now uses `WHERE session_id=? AND phase='BEFORE' ORDER BY window_end DESC,id LIMIT 500`: SQL filters session/phase **before** applying the limit. `RcaService.generate` keeps the newest row per service/type from that package. The general `list` still includes AFTER. Stored report citations outside the visible 500 are recovered by `includeCitations` with both session and evidence ID predicates.

## Verification on 2026-10-05

Command: `./gradlew build integrationTest --no-daemon` from the repository root, with approved access to Docker Desktop. BUILD SUCCESSFUL. The new H2 test suite and its identical MySQL Testcontainers subclass passed all three contracts:

- Two BEFORE + 501 later AFTER: general list contains 500 AFTER, generated/saved/reloaded report cites the BEFORE IDs; citation lookup restores them and validation succeeds.
- 501 BEFORE: returns newest 500, deterministic ID order on timestamp ties, no rows/citations leak from another session.
- No BEFORE (including an AFTER-only session): stored/reloaded report has confidence zero, empty citations and explicit insufficient-evidence hypothesis.

MySQL uses `mysql:8.4.6`, a fresh Testcontainers database with tmpfs and the real Flyway migration. H2 uses its own generated in-memory database in MySQL mode. These are different executions, not interchangeable evidence. The provider is mocked/unconfigured; no paid LLM/API request occurs.

A final uncached full build/infrastructure run is recorded in [validation](VALIDATION_20261005.md). Existing Compose containers, named volumes and DB data are not used by these tests.
