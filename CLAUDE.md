# CLAUDE.md — Trust The Process (TTP)

Personal offline-first workout tracker (Hevy-inspired). React + TypeScript PWA, SQLite (WASM,
OPFS) in a Web Worker, hosted on GitHub Pages as a user site (`https://crusaderrrr.github.io/`,
base `/`), used on one iPhone. **The full spec
is `SPEC.md` — read the relevant section before every task.** Current status lives in
`PROGRESS.md` — update it when a task or phase changes state.

## Working agreement
- Work **one phase at a time** (SPEC §9). Don't start the next phase until I confirm the current
  one works on my iPhone.
- No plan approval needed: implement directly and track progress in `PROGRESS.md` (tick tasks,
  add a dated log line per phase/milestone).
- Don't add dependencies beyond SPEC §2 without asking first.
- Small, focused commits with clear messages. One concern per commit.
- If the spec is ambiguous or seems wrong, say so and propose a fix — don't silently improvise.

## Commands
- `npm run dev` — dev server
- `npm test` — Vitest (domain logic)
- `npm run build` — production build to `dist/`
- `npm run lint` / `npm run typecheck`

Run `typecheck` and `test` before saying a task is done.

## Architecture rules
- All SQL runs in `src/db/db.worker.ts`. UI → `repositories/` → `db/client.ts` (RPC) → worker.
- SQL only in `src/repositories/` and `src/db/migrations.ts`. Never in components or hooks.
- `src/domain/` is pure TypeScript: no React, no DB imports. Every function there has tests.
- Schema changes = new migration that bumps `PRAGMA user_version`. Never edit an applied migration.
- `PRAGMA foreign_keys = ON` on every connection.
- Persist every user action immediately; no unsaved in-memory workout state.
- TypeScript strict; no `any` outside the worker's sqlite handle.

## Non-negotiable gotchas (details in SPEC §7)
- Local dates via `domain/dates.ts` only — never `toISOString()` for calendar dates.
- ISO weekdays (1 = Mon … 7 = Sun); convert from JS `getDay()` in one helper.
- VFS is `opfs-sahpool` with pool name `ttp`, DB file `/ttp.sqlite3`; no COOP/COEP headers
  needed. Never rename either after launch.
- Vite: `base: '/'`, `optimizeDeps.exclude: ['@sqlite.org/sqlite-wasm']`,
  `worker.format: 'es'`. PWA `globPatterns` must include `**/*.wasm`.
- `HashRouter`, not `BrowserRouter` (GitHub Pages has no SPA fallback).

## Out of scope for v1
Social features, accounts, sync, templates/routines, push notifications, localization,
non-kg units. Don't build them; note ideas in `IDEAS.md` instead.

## Style
- UI language: English. Mobile-first, dark mode default, Tailwind.
- Functional components + hooks. Feature folders under `src/features/`.
- Prefer clarity over cleverness; explain non-obvious decisions in a short comment.
