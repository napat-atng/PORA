# PORA verification status

Verified on 9 October 2026 (Asia/Bangkok) using Node.js 24.15.0 and a local production preview at `http://127.0.0.1:4173`.

## Automated checks

- `npm.cmd test`: 19 Vitest cases pass, covering budget formulas, payment/undo, linked edits/deletions, money/date boundaries, opening balance protection, safe integer overflow, backup compatibility/validation, quotas, and cross-tab writes.
- `npm.cmd run build`: TypeScript and Vite production build pass.
- Playwright with desktop Chromium: 53 browser assertions pass: 38 across setup, bill payment/undo, income/expense entry, reconciliation, linked editing/deletion, personal/sample isolation, persistent reloads, backup round trips, cancellation, invalid/corrupt data, write failures, and concurrent tabs; 8 for offline behavior/manifest/icons; 7 for application updates.
- Keyboard: native dialog contains Tab focus and restores focus on Escape.
- Layout: no horizontal overflow at 320px, 390px, and 1440px; mobile and desktop screenshots inspected.
- Network: no external fonts or trackers observed during tested flows.
- PWA: production app reloads and saves offline after cache activation; new entries survive offline reload. PNG dimensions verified at 192, 512, and 180 pixels.
- Updates: a second production build with different asset hashes installs as a waiting worker. Update can be deferred, is disabled with an open dialog or edited settings, and preserves saved data after acceptance. The final deliverable is rebuilt with standard minification.

Browser checks use synthetic financial data in isolated Playwright sessions. Generated screenshots, scripts, and backups are excluded from Git.

## Not yet verified

- Safari on an actual iPhone and Chrome on an actual Android device, including the on-screen keyboard and installation/storage behavior. Viewport simulation is not device validation.
- Cloudflare Pages publication and checks on its actual HTTPS origin.
- A 3–5-person trial over one income cycle; no usage or feedback results exist yet.

These outstanding checks must not be reported as passed. See `IMPLEMENTATION_PLAN.md` sections 13–16 for the acceptance criteria.
