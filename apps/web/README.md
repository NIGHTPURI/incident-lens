# IncidentLens dashboard

React, TypeScript, and Vite client for the control plane. All telemetry comes from `/api`; missing measurements display **확인 불가 / Unavailable**, while an experiment phase that has not completed displays **대기 중 / Pending**.

```powershell
npm ci
npm run dev
```

Development serves port 5173 and proxies `/api` to `http://localhost:8080`. The production container serves port 8080 with unprivileged Nginx and proxies `/api` to `control-plane:8080`.

The lab creates an incident session and controls a bounded fault. Evidence collection explicitly selects BEFORE or AFTER. Reports link their citations to the evidence cards. Experiments prepare a record and provide the exact PowerShell runner command; the browser does not start k6. That command preserves the session's latest enabled fault parameter, or explicitly uses 400 when none exists. A session accepts one experiment, and each experiment phase must be unused: prepare the experiment before sending scoped manual traffic, or create a new session.

```powershell
npm run build
npm test
npx playwright install chromium
npm run test:browser
```

The 33 unit/component tests cover API failures, missing telemetry, fault ownership, evidence citations, phase provenance, and measurement formatting. Browser tests exercise the session → fault → evidence → RCA → experiment flow on desktop, laptop and mobile with explicitly labelled route fixtures. The bilingual cases additionally visit every populated page in Korean and English, inspect mobile containment, preserve machine values and raw evidence/RCA, and verify Korean → English → reload → English plus a new-tab revisit. These verify the client contract, not real backend behavior or performance. The separate offline browser test refuses API connections and captures `screenshots/dashboard-empty.png`; it contains no invented telemetry.

The full repository verification and integration tests cover the real backend. Frontend dependencies are locked by `package-lock.json`; `npm audit` can be run separately to check the current advisory database. Chromium browser tests require a browser download, while unit tests and the production build do not.

To capture an existing completed experiment from the real stack, run:

```powershell
node scripts/capture-live.mjs http://localhost:3000 <session-uuid>
```

Use the configured web port if it differs. This command reads existing API records, navigates the live dashboard, checks citation targets and browser errors, and saves four screenshots plus `screenshots/live-capture.json` with their measurement provenance. It does not create traffic or change faults. The `*-live.png` images are real local observations; they are separate from the deliberately disconnected `dashboard-empty.png` test capture.

## Korean / English UI

Korean is the default. The compact selector at the top right offers **한국어** and **English**. Selection updates the current screen immediately and saves `ko` or `en` under `incidentlens.locale` in localStorage. Reloads and later visits restore that preference; unsupported stored values fall back to Korean. When the browser denies storage, switching still works for the mounted app. The provider also sets the document language, title and description.

`src/i18n/translations.ts` contains the two dictionaries, typed keys and simple named interpolation. `I18nProvider.tsx` supplies `useI18n()` / `t("nav.overview")` through React Context. There is no new dependency. `format.ts` uses the selected language for dates, numbers and missing-data labels. Add UI copy to both dictionaries; TypeScript checks key parity, and tests check nonempty translations and matching interpolation parameters.

Navigation, overview, all four scenarios, fault controls, incident detail/timeline, evidence/RCA framing, comparisons, forms, notices, errors, empty states, status badges, table headings and accessible labels are localized. Switching does not reset selected sessions, typed names or scenarios and does not issue API mutations. Existing English workflows explicitly choose English in their browser context.

Backend-provided evidence explanations, RCA narratives/actions/uncertainties, server error details, user-entered session names, service/provider/source names and technical identifiers remain original. Evidence types retain their existing readable technical formatting. Kafka/Redis/API/RCA/Trace, IDs, units and generated PowerShell commands are not translated. Known scenario/status/phase values use presentation mappings; REST paths, JSON fields, enum values and backend/infrastructure files are unchanged. The actual database fault identifier remains `DATABASE_DEGRADATION`.

**BEFORE means the fault is active in this project's existing experiment protocol.** Its Korean label is **변경 전**, with **장애 상태** beneath it; AFTER is **복구 후**. Calling BEFORE a healthy baseline would misrepresent the measured experiment. All machine phase values stay BEFORE/AFTER.

The original layout is retained, with a small selector, Korean OS font fallbacks, word-preserving Korean heading wrapping and a wrapping mobile header. Existing mobile navigation and wide comparison tables retain their bounded horizontal scrolling. Browser-generated localization captures are kept in ignored `test-results/`; fixture screenshots are not measurements. On a minimal Linux browser image, install a Korean system font for visual review; Windows 11 uses Malgun Gothic. The live-capture script captures both languages while retaining the existing English screenshot paths. Its manifest includes viewport, locale, real session/experiment provenance, inspected contrast and verification that saved measurements did not change.

## Readability and state correctness

Secondary copy and table text are larger and higher contrast; keyboard users get a skip link, explicit focus rings, labelled scroll regions and radio focus. Status icons accompany text, and comparison direction has a text label. Zero values and absent measurements remain distinct, with nearby explanations. The lab explains the existing runner workflow. RCA has direct jump/back links for long evidence lists and explicitly analyzes BEFORE observations.

Late responses are guarded by request revisions and selected session identity. Overview and detail read errors are independent; an overview refresh cannot hide a failed incident read. Six deferred-response/state regression tests cover freshness, session isolation, error recovery, zero/missing samples and an unreachable fault store. See the repository publication review for tradeoffs and limits.
