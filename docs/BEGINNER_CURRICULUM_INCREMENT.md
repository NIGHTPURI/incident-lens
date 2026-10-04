# Beginner curriculum: implementation record


## Final verification for the full curriculum

- Frontend: **47 tests passed**; TypeScript `--noEmit` passed.
- Full Playwright suite: **36 passed** across desktop/laptop/mobile. New coverage
  walks all 15 stages in both languages, checking scope, examples, diagnosis,
  independent criteria and no implicit read/mastery credit. APIs are fixtures;
  no real experiment/fault/report was generated.
- Eleven stage-5–15 Java programs passed with installed Java and cached H2.
  Targeted 14/15 checks passed again after retry/DLQ and bounded-output refinements.
- Actual JPA/H2 tests: **3 passed**, including observed N+1 vs fetch-join SQL counts.
- Earlier unchanged foundation evidence remains: 4 Spring MockMvc/Service tests,
  7 Java execution cases and 8 real toy-HTTP cases passed.
- Production build succeeded in `/tmp/incidentlens-full-curriculum-build`, away
  from live assets. Vite warns that the single JS chunk is about **531 kB minified /
  172 kB gzip**, now containing the full bilingual curriculum. Lazy-loading lesson
  content is a possible follow-up; the warning is not suppressed or a test failure.
- Existing user-facing port 18000 remains untouched. Local development preview:
  `http://127.0.0.1:18173/`. These checks precede separately authorized publishing; the live deployment was not changed.

The backend CI now also runs the isolated Java/HTTP/H2 examples and both standalone
Spring/JPA test projects after its normal build/integration checks, and uploads their
test reports. No deployment job was added.

## Current completion status (supersedes the first-increment scope below)

All 15 stages now have authored Korean and English lessons, prerequisites/glossary,
multiple topic explanations, minimal examples/expected output, selectable flows,
predictions, deliberate-failure diagnosis, independent exercises, hints/solutions,
tradeoffs and observable criteria. The UI no longer presents stages 5–15 as planned.
Reading remains separate from independent performance; no click awards mastery.

Stages 5–11 were completed first: relational persistence; transactions/JDBC/JPA/N+1/
pagination; authentication/authorization and web-security boundaries; testing and
debugging; collaboration/contracts/CI; Linux/Docker/configuration/deployment concepts;
observability/percentiles/controlled-load reasoning/RCA. Stages 12–15 then add index/
cache tradeoffs, actual-thread concurrency and idempotency, transactional outbox and
message-processing boundaries, and an independently assessed capstone with optional
bounded report/LLM-output validation concepts.

Execution scope is always visible above the tabs in advanced lessons. Real H2/JPA/
JDBC/thread checks are distinguished from in-memory Redis/Kafka/deployment/LLM models.
JPA is actually executed, not pseudocode: three isolated tests check 4-query lazy
traversal, 1-query fetch join and stable 2/1-row pagination. All eleven standalone
stage programs ran successfully with existing Java/H2; modified stages 14/15 were
checked again after adding bounded retry/DLQ and null/UTF-8 output-budget checks.
See `examples/beginner/README.md` for the per-stage execution/limit matrix.

The capstone has a runnable sequential service reference and a concrete independent
HTTP/auth/concurrency integration assignment. A supplied solution does not substitute
for a learner's independent work. Actual MySQL, Redis, Kafka, deployed infrastructure,
browser authentication and LLM provider behavior have not been newly integration-tested.
These are explicit exercise/verification boundaries, not claims of completed operations.

Implementation used no new downloads, Docker builds, existing-data writes or cleanup.
Publishing and merge were authorized separately after these implementation checks. Preview remains on port 18173; original port
18000 and its dist files are preserved. The earlier implementation record below is
retained as history; its pending-stage list is now superseded.

## First-increment scope (historical)

This is an incremental implementation, not a claim that all fifteen stages are
finished. The roadmap has stable identifiers for all fifteen requested stages.
Stages 1–4 have Korean and English lessons with prerequisites, definitions,
explanations, small examples, expected output, explanatory selectable flows,
prediction/reveal, guided work, deliberate failures, diagnosis, independent work,
hints, explanations, tradeoffs and observable pass criteria. Stages 5–15 are
explicitly marked **planned / lesson pending** and cannot receive read completion.

1. Files, shell, programs/processes/ports, environment variables and Git basics.
2. Java variables/types, arithmetic, branching, loops, methods, objects, collections,
   exceptions and small checks; no Spring prerequisite.
3. Browser/frontend/backend, URL/network/HTTP/JSON/HTTPS and real request boundaries.
4. Spring Boot, Controller/Service, constructor DI, conversion, business validation,
   consistent expected error responses and separate Service/HTTP tests.

The evolving example is one product-total calculation: text → Java → standard
library HTTP → standalone Spring. It needs no MySQL, Redis, Kafka or Docker.
See `examples/beginner/README.md` for executable commands and limits.

The interior learning UI uses Concept / Minimal example / Flow / Troubleshooting /
Independent practice tabs, keyboard navigation and the existing learning-help
layout. Reading completion and self-reported independent-work evidence are separate.
Next never awards completion or mastery. No AI chat, paid API or job-readiness claim.

## Existing behavior and data

The original six experiment lessons and their controls/reports remain available
through **Existing experiment lessons and records / 기존 실험 수업·저장 기록**.
Their storage keys and independent async/outbox predictions are not overwritten.
`incidentlens.curriculum.v1` stores the new stable-ID selection, notes, explicit read
marks and self-reported evidence. Legacy selection maps to a relevant new stage;
unavailable mapped stages remain honestly labeled pending. Existing original lesson
records remain reachable. No experiment, fault or report was changed for this work.

The position-based `lessonIndex === 5` experiment condition is now the semantic
`lesson.id === "diagnose"`; flow selection also uses stable IDs.

## Transient feedback scope

`App.tsx` synchronously invalidates transient notices and operation errors when a
route, learning view, lesson/mode/tab/scenario or selected session changes. Each
operation captures both a context generation and operation generation. Late success
and failure responses cannot repopulate feedback after leaving and returning.
Session creation cannot override selection after its original context expires.
Refreshing data and showing actual global active-fault warnings stay independent.
Navigation does not cancel or undo a server mutation that was already submitted.

Added regressions cover completed-before-navigation notices, in-flight navigation,
leave-and-return, late failure, current failure, session changes, lesson changes,
late creation and global warning preservation. Existing polling freshness tests remain.

## Verified locally

- Frontend: 47 Vitest tests passed; no-output TypeScript check passed.
- Browser: all 33 existing/new Playwright cases passed across desktop, laptop and
  mobile Chromium, with fixture APIs. No real experiment mutations were made.
- After bilingual output-model refinement, targeted curriculum cases passed on all
  three viewports; screenshots revealed missing Korean fallback in code/output and
  textarea controls, fixed using the already shipped Korean font.
- Frontend production build passed into `/tmp/incidentlens-curriculum-build`.
  The existing `apps/web/dist` and port-18000 deployment were not replaced.
- Java: 7 source-file execution cases passed.
- Toy HTTP: 8 actual HTTP cases passed against a script-owned temporary server on
  18181, then that server was stopped. Initially proposed ports 18081/18082 were
  already occupied; no existing process was stopped. Examples now use 18181/18182.
- Spring: 4 tests passed via the existing Gradle wrapper with `--offline` and
  bounded memory. These include MockMvc HTTP boundaries, not live Spring HTTP.
- The original IncidentLens backend is unchanged; its heavy integration suite and
  Docker rebuild were not run. No dependencies downloaded, cleanup performed,
  commit, push, merge or deployment.

Initial new test failures came from mismatched role/name selectors, a BEFORE button
whose active-fault precondition was not met in the fixture, and the intentionally
changed embedded home heading. Those were corrected without weakening behavior
checks. Full regression then passed.

## Review location and ownership

Working folder: `/home/mireu/Dev/incident-lens-career-20261002`.
Branch: `feat/beginner-curriculum-scoped-feedback`, based on the existing feature
HEAD `adc432abecb08c4a798728f0d7db3dae75d015c2`; no second checkout/worktree.
Remote main was read-only verified at `ef25a383fd6bf2c91d7c3200f97cdf19744a03a6`.
No fetch/rebase/reset was used to alter the existing feature history.

Before edits, repository state was clean. Existing Codex processes pointed at this
folder, but repeated CPU/status checks showed no active edit/build child processes
or working-tree activity. They were not interrupted or sent input. Their interactive
idle state could not be inspected directly. At the first implementation handoff, edits were uncommitted for review.

A separate local Vite preview was started on `http://127.0.0.1:18173/`, with API
proxy to the existing port-18000 app. Windows GET returned 200; port 18000 continued
serving its original `index-3dDQ6hsV.js`. The preview can stop when the task host is
closed; it is not a deployment. It has real experiment controls in the preserved
reference/free lab, so clicking those explicitly will operate the existing lab.
The curriculum itself does not automatically execute code or experiments.

## First-increment remaining plan (now authored; historical)

5–6: Extend the same product example with persistence, MySQL, constraints/CRUD,
transactions, JDBC/JPA, generated SQL, N+1 and pagination. Each needs real data-boundary
tests and independently solvable exercises before becoming available.

7–11: Authentication/authorization and web security; deeper tests/debugging;
issues/branches/PR/review/API contracts/CI; Linux/Docker/configuration/health/deploy/
rollback; logs/metrics/traces/percentiles/load and evidence-based RCA. Introduce
dependencies only after the learner has the requisite concept and observable need.

12–15: Measured indexing/Redis tradeoffs; concurrency/isolation/locks/idempotency;
workers/Kafka/outbox/retries/ordering/backpressure; independently implemented and
reviewed capstone with optional bounded/evaluated LLM integration.

For each stage, author both languages, verify runnable examples, cover failures and
observable pass criteria, then change its status from planned. The old advanced
reference lessons are supporting material, not substitutes for these new stages.

## Learner OS selector / 학습 OS 선택

The 15-stage curriculum now offers Windows (PowerShell) and Linux (Bash · WSL).
The choice is stored separately as `incidentlens.learning.platform.v1`, defaults
from the browser host and preserves an explicit override across locale/reload.
Changing it invalidates contextual feedback but does not alter progress, notes,
experiment sessions, reports or the global active-fault warning. No API mutation
is issued. Java/SQL/HTTP/Compose source formats remain their own languages;
shell commands, preparation and troubleshooting follow the selected environment.

PowerShell variants use `gradlew.bat`, `curl.exe`, session environment syntax,
quoted paths and `;` classpaths. Process/port inspection falls back to read-only
`netstat.exe` when `Get-NetTCPConnection` is denied. Linux uses Bash/Unix wrappers
and `:` classpaths; WSL instructions explicitly run inside WSL. Python/H2 helpers
accept only an existing `INCIDENTLENS_H2_JAR` and never download missing jars.
The first two lessons require no Python or HTTP server for their validation.

Verified locally on both OSes: seven foundational Java outputs, eight HTTP cases,
and eleven advanced isolated programs. Native Windows also verified Java compile,
semicolon classpath, child-shell environment and curl.exe 200/400/404. Linux
offline Spring tests (4) and JPA tests (3) passed. Windows Gradle builds remain
unverified because native Windows offline caches are absent; no download attempted.
An existing JDK21 and Python3.13 executable were used directly on Windows because
its default Java PATH selected Java8 and the py launcher had a stale registration.
WSL-share JAR reads timed out; copying only the existing small jar into the
authorized local test folder resolved execution without clearing any cache.

기존 15단계에 OS/셸 선택을 추가했으며 언어·진도·예측·실험 기록과 별도로 저장합니다.
실제 PowerShell 명령과 문제 해결 안내를 제공합니다. Windows 캐시가 없는 Gradle 검사는
미검증으로 구분하며 설치·관리자 실행·정책 변경·캐시 정리를 수행하지 않았습니다.

## Reading and interaction refinement / 읽기·상호작용 개선

The current learning layout keeps its existing inner tabs and coaching sidebar.
Lesson prose is 17px on desktop and 16px on mobile, with 1.95 line height,
bounded text width, separated paragraphs/cards, glossary lists and ordered
exercise steps. Formatting preserves the authored words and leaves source code
unchanged. Native checkboxes/radios are 24px with clickable 64px label rows,
keyboard Space semantics and visible focus; buttons and disclosure summaries
have at least 44px targets. Native details provide optional hint/solution views.

Each of the 15 stages now has one authored objective concept question with
correct/retry feedback. This never grades free-text predictions or executes code,
and does not award reading credit or mastery. Answers persist separately under
`incidentlens.curriculum.checks.v1`; invalid/blocked storage is handled honestly.

Reading feedback follows an explicit self-report checkbox and a successful save.
Practice self-review can be saved only after nonempty evidence and an explicit
comparison with criteria. The v1 progress reader tolerates an additional `reviewed`
map containing the evidence snapshot, without migrating/deleting older records.
Editing evidence invalidates the current confirmation. Recording “not executed”
is allowed and never becomes execution verification or earned certification.
Feedback animations are brief and event-driven; reduced-motion preference disables
them and learning transitions. No sounds, paid calls or experiment mutations.

Verified: TypeScript and 53 unit tests; all 48 desktop/laptop/mobile browser tests,
including reduced motion, focus/Space, pointer targets, hint/answer/record feedback,
locale/OS/reload persistence and existing late-notice/active-fault regressions.
Actual 18173 screenshots in Korean/English showed no overflow, browser errors or
API writes. The existing 18000 app and its backend remained intact.

문단·카드 여백과 글 크기를 넓히고 24px 체크 표시와 64px 클릭 행을 적용했습니다.
확인 문제는 개념만 검사하며 코드 실행·숙련 점수를 만들지 않습니다. 실습 확인은
명시적 자기 보고로 저장하고 증거를 수정하면 확인 상태를 다시 요구합니다.


## Shared palette and persistent themes / 공유 색상과 테마

The light palette follows the observed VibeCoach lesson interior (2026-10-04):
white surfaces, #1a1f29 headings, #333d4b text, #3182f6 blue accents,
#e5e8eb borders and #e8f3ff selection. Small text and buttons use darker blue
variants to retain contrast. Reference: https://xn--os4bm5dj7a.com/vibe-coach
The reference/team site is not modified.

The shared `theme.css` tokens cover learning and free-lab navigation, cards,
controls, code, hints, feedback, populated evidence/report/comparison views
and unavailable telemetry. Positive, warning, negative and active-fault states
retain distinct semantic colors in both themes. Existing reading sizes, targets,
focus outlines and reduced-motion behavior remain in place.

The native, labeled Light / Dark / System selector appears in either header.
System is the default; `incidentlens.theme.v1` stores an explicit preference
separately from language, learning OS and all progress/experiment records.
System responds to live OS color-scheme changes. Explicit Light/Dark ignores
those changes. Storage denial still allows a transient choice and falls back
to System on reload. Cross-tab storage changes update the theme only.
The small head script resolves theme/color-scheme/background before React
loads; the mounted hook maintains the same state and cleans up its listeners.
Changing theme never calls an experiment mutation or changes fault state.

Final local validation: 53 unit tests, production build and 66 browser tests
across desktop/laptop/mobile passed. Browser coverage includes both themes,
System changes, reload, independent language/OS/reading progress, keyboard
focus, pre-React theme application, invalid/denied storage, semantic contrast,
populated results and an API mutation guard. The isolated examples passed
7 Java cases, 8 real HTTP cases and all 11 advanced stage programs. Actual
18173 desktop/mobile inspection found no text-contrast audit failures,
viewport overflow, browser errors or API writes. The existing 18000 runtime
remains separate and intact. Vite retains a non-fatal main-bundle size advisory.

라이트·다크·시스템 테마는 학습 언어·OS·진도와 별도로 저장합니다.
시스템 설정은 실시간으로 따르며 직접 선택한 테마는 새로고침 뒤에도 유지됩니다.
저장이 차단되면 현재 화면에서는 선택을 유지하고 다시 열 때 시스템을 따릅니다.
성공·주의·오류·활성 장애 경고의 구분과 키보드 초점·읽기 크기를 유지했습니다.
테마 전환은 실험 생성·장애 변경·보고서 재생성을 실행하지 않습니다.
