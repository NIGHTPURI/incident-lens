# IncidentLens dashboard

React, TypeScript, and Vite client for the control plane. All telemetry comes from `/api`; missing measurements display **Unavailable**, while an experiment phase that has not completed displays **Pending**.

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

The 14 unit/component tests cover API failures, missing telemetry, fault ownership, evidence citations, phase provenance, and measurement formatting. Browser tests exercise the session → fault → evidence → RCA → experiment flow on desktop and mobile with explicitly labelled route fixtures. These verify the client contract, not real backend behavior or performance. The separate offline browser test refuses API connections and captures `screenshots/dashboard-empty.png`; it contains no invented telemetry.

The full repository verification and integration tests cover the real backend. Frontend dependencies are locked by `package-lock.json`; `npm audit` can be run separately to check the current advisory database. Chromium browser tests require a browser download, while unit tests and the production build do not.

To capture an existing completed experiment from the real stack, run:

```powershell
node scripts/capture-live.mjs http://localhost:3000 <session-uuid>
```

Use the configured web port if it differs. This command reads existing API records, navigates the live dashboard, checks citation targets and browser errors, and saves four screenshots plus `screenshots/live-capture.json` with their measurement provenance. It does not create traffic or change faults. The `*-live.png` images are real local observations; they are separate from the deliberately disconnected `dashboard-empty.png` test capture.
