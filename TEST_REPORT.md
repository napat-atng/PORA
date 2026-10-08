# PORA verification status

Verified on 9 October 2026 (Asia/Bangkok) using Node.js 24.15.0 and a local production preview at `http://127.0.0.1:4190`.

## Automated checks

- `npm.cmd test`: 26 Vitest cases across three files pass, covering budget formulas, payment/undo, linked edits/deletions, money/date boundaries, opening balance protection, safe integer overflow, backup compatibility/validation, quotas, cross-tab writes, history filters/totals, and backup reminder metadata.
- `npm.cmd run build`: TypeScript and Vite production build pass.
- Playwright with desktop Chromium: 53 browser assertions pass: 38 across setup, bill payment/undo, income/expense entry, reconciliation, linked editing/deletion, personal/sample isolation, persistent reloads, backup round trips, cancellation, invalid/corrupt data, write failures, and concurrent tabs; 8 for offline behavior/manifest/icons; 7 for application updates.
- Keyboard: native dialog contains Tab focus and restores focus on Escape.
- Layout: no horizontal overflow at 320px, 390px, and 1440px; mobile and desktop screenshots inspected.
- Network: no external fonts or trackers observed during tested flows.
- PWA: production app reloads and saves offline after cache activation; new entries survive offline reload. PNG dimensions verified at 192, 512, and 180 pixels.
- Updates: a second production build with different asset hashes installs as a waiting worker. Update can be deferred, is disabled with an open dialog or edited settings, and preserves saved data after acceptance. The final deliverable is rebuilt with standard minification.

Browser checks use synthetic financial data in isolated Playwright sessions. Generated screenshots, scripts, and backups are excluded from Git.

## UX improvements

- Unsaved dialogs and settings require confirmation before discarding edits.
- Expense entry focuses the amount, accepts an optional note, and offers note presets; income has its own action.
- The overview distinguishes the last spending day from the income date and explains reserved money.
- Bill payment accepts a payment date, shows a receipt, and offers undo from the overview.
- History supports search, type/date filters, daily groups, and totals excluding the opening balance; custom date filters fit a 320px viewport.
- Backup controls show the latest export request and remind users when changed data needs another backup. Export timestamps do not prove that a download was saved; installing the app does not provide online backup.

In addition to the 53 regression assertions above, 25 feature-specific browser assertions passed across development checkpoints. Screenshots were inspected. Financial storage keys and the snapshot schema remain unchanged.

## Production deployment

- Published on 9 October 2026 (Asia/Bangkok): `https://pora-demo.pages.dev`.
- Cloudflare Pages project: `pora-demo`; production branch: `main`; deployed source commit: `bcc18b5`.
- Deployment ID: `8dbdbf26-5f3e-402b-8954-0d4b24f68b71`; immutable URL: `https://8dbdbf26.pora-demo.pages.dev`.
- HTTPS returns HTTP 200 with the PORA page title. A fresh isolated browser opens the welcome page without another user's data.
- On the stable production origin, all 38 data/UI assertions and 8 offline/manifest/icon assertions pass (46 total).
- An isolated old-version production client retained its exact saved snapshot and entry after loading the new UI (three assertions). The first update attempt timed out because the initial page had no controlling worker; reloading and accepting the update succeeded. The seven local update assertions above used a controlled client.
- This is a static Direct Upload deployment of 11 files from `dist/`; no database, Functions, paid add-ons, or custom domain were provisioned. Git pushes do not trigger deployment.
- Wrangler 4.149.0 initially delegated project creation to Workers and failed without deploying anything. Creating the Pages project directly with its `--force` option succeeded; subsequent upload used normal `wrangler pages deploy`.

## User-reported device check (before this UX release)

- 9 October 2026 (Asia/Bangkok): the user reports that the production website opens normally on Android and, after the requested expense-entry/reload check, the data remains. The user also reports that the requested offline check (disconnect, reload, and add an expense after offline readiness) works, and that existing data remains when opening from the home-screen icon after the requested installation/add-to-home-screen check. Device model, browser, and installation method were not specified. Persistence after explicitly closing/reopening the browser has not been reported as tested on that device.

## Not yet verified

- Safari on an actual iPhone; remaining Android checks, including browser identification, the on-screen keyboard, and persistence after closing/reopening the browser. Viewport simulation is not device validation.
- A 3–5-person trial over one income cycle; no usage or feedback results exist yet.

These outstanding checks must not be reported as passed. See `IMPLEMENTATION_PLAN.md` sections 13–16 for the acceptance criteria.
