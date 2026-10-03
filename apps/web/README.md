# IncidentLens web client

React, TypeScript and Vite provide the six-lesson backend learning lab and the existing incident dashboard. The learning page opens at `/`; `?view=lab` opens the expert fault controls, and `?embed=1` hides the local navigation for a host site's menu. The new lesson code is in `src/learning/`: bilingual content and code references in `content.ts`, interactions in `LearningLab.tsx`, and layout tokens in `src/styles.css`.

```bash
npm ci
npm run dev
```

The development server runs at **http://localhost:5173** and proxies `/api` to `http://localhost:8080`. To use another **local** control-plane port, set `INCIDENTLENS_API_TARGET=http://127.0.0.1:18080` when starting Vite. The production Nginx container proxies `/api` to `control-plane:8080`.

Lessons are readable without backend services. The screen checks local service connectivity before enabling experiment controls. It never starts a fault or k6 on navigation, reload, or language change. Creating a session, changing a fault, collecting evidence, generating RCA and preparing a comparison use the existing `api.ts` methods. The displayed Bash command starts k6 **in a terminal**; the existing PowerShell command remains available on the comparison page. The runner owns BEFORE (fault active), AFTER (fault disabled), recovery and cleanup. Missing measurements remain unavailable rather than zero.

## Development checks

```bash
npm run typecheck
npm test -- --run
npm run build
npx playwright install chromium
npm run test:browser
```

Vitest covers API and response errors, evidence/RCA presentation, stale read protection, language dictionaries, and complete bilingual lesson content with real source links. Playwright checks the learning path, flow and keyboard interaction, Korean/English persistence, desktop/laptop/mobile layout, folded mobile help, embedded mode, explicit controls for all four faults, and the original dashboard workflow. Browser API fixtures test UI behavior and are **not performance measurements**. Backend and local k6 validation are recorded in [the repository verification record](../../docs/LEARNING_VERIFICATION_2026-10-03.md).

To capture the new screen from a locally running Vite app and backend, start Vite on port 4174:

```bash
INCIDENTLENS_API_TARGET=http://127.0.0.1:18080 npm run dev -- --host 127.0.0.1 --port 4174
```

In another terminal in `apps/web`, run `node scripts/capture-learning.mjs`.

The script only reads the page and saves Korean/English desktop/mobile images plus `screenshots/learning-capture.json`. It creates no session or traffic. The self-hosted subset of Noto Sans KR under `public/fonts/` keeps Korean legible even when the browser system has no CJK font; its OFL license is included.

The older completed-incident capture remains available with `node scripts/capture-live.mjs http://localhost:3000 <session-uuid>`. It reads an existing session and checks citations without creating traffic.

## Translation and original evidence

`src/i18n/translations.ts` contains typed Korean/English dashboard dictionaries. `src/learning/content.ts` and the local `copy` map in `LearningLab.tsx` cover lesson text, flow, questions, hints, controls and accessibility names. TypeScript checks dictionary key parity; the content test rejects blanks and broken source paths. `I18nProvider.tsx` stores the choice in `incidentlens.locale` and updates the document language and metadata. Lesson position, predictions and reflection use separate localStorage keys. Language switching does not reset form state or mutate an API.

Raw evidence explanations, generated RCA text, server diagnostics, user session names and source code retain their original language. The lesson labels a report's original language as a script-based estimate; UI switching does not translate stored reports. Technical identifiers and machine phase values remain stable. **BEFORE means active fault; AFTER means disabled fault.** A completed comparison must be read with workload, units, cache state and missing-data limits in mind.

The dashboard protects against late overview/detail responses with revision and selected-session checks. Action buttons disable during a pending operation; the underlying API uses bounded requests and reports errors. The optional LLM's 65,536-byte HTTP receive limit, cancellation and rule fallback live in the backend and are tested there.
