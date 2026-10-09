# PORA verification status

Verified on 9 October 2026 (Asia/Bangkok) using Node.js 24.15.0 and a local production preview at `http://127.0.0.1:4197`.

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

### Mantine wallet redesign

- Researched NN/g visual hierarchy and progressive disclosure plus finance design references; decisions and source links are in `DESIGN.md`.
- Replaced UI controls with Mantine 9.7.1: Button, ActionIcon, TextInput, NativeSelect, Paper, Menu, Badge, ThemeIcon, Alert, Accordion, Modal, and Text/Title. Browser confirmations became Mantine confirmation modals. The browser's leave-page warning remains native.
- Introduced a light canvas/navy wallet card, prominent daily allowance, secondary cycle balance, concise supporting copy, and row menus for edit/delete. At 320px, balance cards become full-width summary rows to preserve readable numbers.
- 26 Vitest cases and the standard production build pass. During migration, the 53 browser regression assertions (38 data/UI, eight offline, seven updates), four draft-preservation assertions, and 39 responsive assertions pass. Browser scripts were adapted to menu items and asynchronous confirmation dialogs; no financial logic, snapshot schema, or storage keys changed.
- Eight dedicated library interaction assertions pass: layered confirmations, cancel retains draft, confirmation focus trap, Escape dismisses only the confirmation, discard returns focus, discard does not save, row editor returns focus, and cancel delete preserves the entry. An Escape propagation issue and menu-trigger focus issue were corrected before release.
- Screenshots of mobile/desktop overview and entry forms were inspected. React review checked hooks, confirmation cancellation, accessible action labels, input labels, provider ownership, and effect cleanup. UI library assets are bundled locally; no external font dependency was added.
- These checks use isolated Chromium sessions and simulated viewport sizes, not new physical Android/iPhone results or user preference evidence.

### Earlier BudgetZen design refresh

- Selected BudgetZen from designmd.ai after comparing finance and calm dashboard styles. `DESIGN.md` records the page prompt, source, and PORA adaptations.
- Applied a light mint hero, white rounded panels, icon tiles, note chips, date badge, accessible darker green actions, subtle shadows, and amber deficit presentation. System fonts keep Thai text and offline operation independent of font services.
- Shortened welcome, overview, forms, history, backup, and PWA copy. Storage, installation, and backup caveats remain available in collapsed native details sections.
- Local checks: 26 Vitest cases, TypeScript/build, and 53 browser regression assertions pass on this refresh, including seven controlled-client update assertions. Final build uses standard minification.
- An additional 39 browser assertions verify all four pages and entry dialogs at 320, 390, 768, and 1440px, custom date ranges, collapsed/expanded help, amount focus, large valid financial values, long notes, and 44px visible button heights. Mobile/desktop overview, settings, welcome, and form screenshots were inspected. These are Chromium viewport checks, not physical-device tests.
- React review: hooks and financial state paths unchanged; native details preserve keyboard interaction; added action icons retain text/accessibility labels; no dependencies or financial schema changes.

### Earlier usability improvements

- Unsaved dialogs and settings require confirmation before discarding edits.
- Expense entry focuses the amount, accepts an optional note, and offers note presets; income has its own action.
- The overview distinguishes the last spending day from the income date and explains reserved money.
- Bill payment accepts a payment date, shows a receipt, and offers undo from the overview.
- History supports search, type/date filters, daily groups, and totals excluding the opening balance; custom date filters fit a 320px viewport.
- Backup controls show the latest export request and remind users when changed data needs another backup. Export timestamps do not prove that a download was saved; installing the app does not provide online backup.

In addition to the 53 regression assertions above, 25 feature-specific browser assertions passed across development checkpoints. Screenshots were inspected. Financial storage keys and the snapshot schema remain unchanged.

## Production deployment

- Published on 9 October 2026 (Asia/Bangkok): `https://pora-demo.pages.dev`.
- Cloudflare Pages project: `pora-demo`; production branch: `main`; deployed source commit: `e6f6bab`.
- Deployment ID: `8cd0669c-a357-4da6-a1c3-cf38e1364c73`; immutable URL: `https://8cd0669c.pora-demo.pages.dev`.
- HTTPS returns HTTP 200 with the PORA page title. A fresh isolated browser opens the welcome page without another user's data.
- On the stable production origin, all 38 data/UI assertions and 8 offline/manifest/icon assertions pass (46 total).
- The 39 responsive/design assertions also pass on the stable production origin (85 browser assertions total for this deployed refresh).
- During the earlier UX release, an isolated old-version production client retained its exact saved snapshot and entry after loading the new UI (three assertions). Its first update attempt timed out because the initial page had no controlling worker; reloading and accepting the update succeeded. The seven local update assertions for this design refresh used a controlled client.
- This is a static Direct Upload deployment of 11 files from `dist/`; no database, Functions, paid add-ons, or custom domain were provisioned. Git pushes do not trigger deployment.
- Wrangler 4.149.0 initially delegated project creation to Workers and failed without deploying anything. Creating the Pages project directly with its `--force` option succeeded; subsequent upload used normal `wrangler pages deploy`.

## User-reported device check (before this UX release)

- 9 October 2026 (Asia/Bangkok): the user reports that the production website opens normally on Android and, after the requested expense-entry/reload check, the data remains. The user also reports that the requested offline check (disconnect, reload, and add an expense after offline readiness) works, and that existing data remains when opening from the home-screen icon after the requested installation/add-to-home-screen check. Device model, browser, and installation method were not specified. Persistence after explicitly closing/reopening the browser has not been reported as tested on that device.

## Not yet verified

- Safari on an actual iPhone; remaining Android checks, including browser identification, the on-screen keyboard, and persistence after closing/reopening the browser. Viewport simulation is not device validation.
- A 3–5-person trial over one income cycle; no usage or feedback results exist yet.

These outstanding checks must not be reported as passed. See `IMPLEMENTATION_PLAN.md` sections 13–16 for the acceptance criteria.
