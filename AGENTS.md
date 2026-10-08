# Repository Guidelines

## Project Structure & Module Organization

This repository contains a Thai-language personal budgeting PWA built with React, TypeScript, and Vite.

- `src/domain.ts`: budget calculations, date/money helpers, bill and entry operations, and snapshot validation.
- `src/storage.ts`: local storage persistence, conflict detection, and JSON backup import/export.
- `src/domain.test.ts`: colocated domain and storage tests.
- `src/main.tsx`: React entry point.
- `public/`: static assets; currently contains `icon.svg`.
- `vite.config.ts`: React integration, PWA manifest, and offline caching configuration.
- `IMPLEMENTATION_PLAN.md`: product requirements and implementation roadmap; consult it before expanding functionality.

The scaffold is incomplete: `src/App.tsx`, `src/styles.css`, and the PNG icons referenced by the PWA configuration are absent. Do not assume the application currently runs or builds.

## Build, Test, and Development Commands

- `npm ci`: install dependencies from `package-lock.json`.
- `npm run dev`: start Vite on `127.0.0.1`.
- `npm run build`: run TypeScript checks, then generate the production bundle in `dist/`.
- `npm run preview`: serve the generated production bundle locally.
- `npm test`: run Vitest once.
- `npm run test:watch`: run Vitest in watch mode.

Run tests and the build before submitting changes; report failures and existing scaffold blockers explicitly.

## Coding Style & Naming Conventions

Follow existing TypeScript conventions: two-space indentation, single quotes, semicolons, and ES module imports. Use camelCase for functions and variables, PascalCase for types and React components, and explicit `type` imports where appropriate. TypeScript enables strict checking and rejects unused locals and parameters. No formatter or linter is configured.

Keep financial logic in `domain.ts` and persistence in `storage.ts`. Represent money as integer satang and calendar dates as `YYYY-MM-DD`; preserve `Asia/Bangkok` date handling and Thai user-facing text.

## Testing Guidelines

Use Vitest with `describe`, `it`, and `expect`; name colocated tests `*.test.ts`. Cover calculation boundaries, bill/entry consistency, invalid backups, storage failures, and concurrent-tab conflicts. Use an in-memory `Store` for persistence tests. No coverage threshold is configured. For UI/PWA changes, manually check mobile layout, installation, and offline behavior.

## Commit & Pull Request Guidelines

This checkout has no Git metadata, so historical commit conventions cannot be verified. Use concise, imperative commit subjects, such as `Fix bill payment reconciliation`. PRs should describe the change, link relevant issues, report test/build results and blockers, and include screenshots for UI changes.

## Data Safety

Keep personal and sample storage separate. Validate imported snapshots and preserve existing data when writes fail. Never commit personal financial backups, secrets, `node_modules/`, or `dist/`.
