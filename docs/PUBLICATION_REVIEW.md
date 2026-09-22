# Portfolio publication review

Reviewed from the clean `be795ad` baseline on 2026-09-22. This is an AI-assisted engineering review, not independent human certification. No new backend feature, infrastructure component or benchmark workload was introduced.

## Findings addressed

| Finding | Change and evidence |
|---|---|
| Runtime captions and provenance were 9–11px; several text contrasts were below 4.5:1 | Raised reading sizes and darkened secondary text while preserving the dark sidebar, green accent and light workspace. Browser inspection measures actual rendered contrast rather than inferring it from a palette. |
| Browser default focus outline nearly disappeared against the sidebar | Explicit 3px focus rings, a contrasting sidebar variant, a skip link, keyboard-scrollable table regions and visible radio focus. Keyboard navigation is exercised in Chromium. |
| Redis unavailability could be mistaken for a disabled fault in the new summary | Show unknown unless the fault store is reachable; regression-tested without changing the API. |
| Missing p95/error-rate samples looked like unexplained failure | Explain absence beside the measurement; retain measured zero as zero and never substitute sample values. |
| Data and RCA could be read as equally authoritative | Label observations with provenance, frame RCA as a hypothesis, show citation navigation and state that RCA uses BEFORE evidence. Provider confidence remains explicitly uncalibrated. |
| Mobile readers could pass dozens of observations before reaching the report | Direct report/back-to-observations links complement individual evidence-ID citations; mobile confidence sits below the hypothesis instead of narrowing its text column. |
| Relative changes used color without interpretation | Text states improved/worsened direction, unchanged, or not comparable. Raw request/error counts use neutral increase/decrease labels; a zero denominator is never given a fabricated percentage. |
| A delayed action on session A could overwrite the displayed detail for session B | Reproduced in an intercepted browser flow before the fix. Requests now have selection/revision guards; Inspect is disabled while an incident mutation is pending. |
| Overlapping polls could replace newer data, and overview success could clear detail errors | Latest-request guards and resource-specific error state. Deferred-response regression tests exercise late polls, post-action refreshes and error recovery. |

The lab now explains configuration, activation, workload execution, evidence collection, recovery and comparison using its existing screens and runner. It does not imply that pressing Enable starts traffic or that the browser runs k6.

## Credibility and contract review

- Backend APIs, scenario/phase values, topics, database schemas, measured results and existing history were preserved.
- Service badges describe endpoint connectivity. A completed experiment and a historical session status do not guarantee that every dependency is currently healthy.
- BEFORE remains the fault-active phase, labelled **변경 전 / 장애 상태**; AFTER is **복구 후**.
- Existing README/ADRs disclose at-least-once delivery, the outbox duplicate window, process-local cache coordination, local-only access, single-broker topology and benchmark confounders. No production users or statistically guaranteed speedups are claimed.
- Compose publishes application/telemetry ports on loopback; DB/Redis/Kafka stay internal. Nginx and Actuator exposure were inspected. This does not replace a penetration test or future dependency advisory review.
- Generated files, credentials and fixture measurements are excluded from the portfolio screenshots. Updated screenshots come from a real saved experiment, using GET-only browser navigation.

## Deliberate limits and owner follow-up

The app still has a large page component. A framework or broad component rewrite would add risk without improving this focused polish task; the asynchronous correctness issues were fixed directly and tested. Browser checks cover three viewport sizes and both locales, but do not certify all WCAG criteria, screen readers or operating systems.

Before publication, personally run the demo on Windows, inspect the real RCA citations and phase meaning, explain outbox/idempotency failure recovery, and read the measured results' caveats. Review [Docker diagnostics](DOCKER_BUILD_DIAGNOSTICS.md) before claiming that the historical build slowdown is solved. The source-of-truth command results are in [VALIDATION.md](VALIDATION.md) and [SESSION_STATE.md](../SESSION_STATE.md).
