# Progress — Trust The Process (TTP)

Phases from SPEC §9. A phase is ✅ only after it's verified on the iPhone (installed icon).
Live URL: https://crusaderrrr.github.io/

Legend: ⬜ not started · 🟡 in progress · ✅ verified on iPhone

## Decisions
- 2026-10-22 — Hevy-style logging: per-set ✓ completion, Previous column, rest timer, live duration.
- 2026-10-22 — Edit/delete finished workouts in v1.
- 2026-10-22 — History tab in v1.
- 2026-10-22 — Set types now: normal / warmup / drop / failure (`set_type`).
- 2026-10-22 — Hosted as user site `Crusaderrrr.github.io` → base `/`.

## Phase 0 — Skeleton + persistence gate ⬜
- [x] GitHub repo connected (`Crusaderrrr/Crusaderrrr.github.io`)
- [ ] Repo Settings → Pages → Source = GitHub Actions
- [ ] Vite + React + TS strict + Tailwind, dark default
- [ ] HashRouter, bottom tab bar (Today · History · Calendar · Exercises · Settings), empty screens
- [ ] DB worker (`opfs-sahpool`, pool `ttp`) + RPC client + migration 1 (schema + seed)
- [ ] "App is open elsewhere" error screen
- [ ] `domain/dates.ts` + tests
- [ ] PWA config (manifest, icons, `**/*.wasm` precache, iOS meta tags, fallback allowlist)
- [ ] GitHub Actions: test → build → deploy
- [ ] Verify: installed from Home Screen, test row survives full close, opens in airplane mode

## Phase 1 — Exercise library ⬜
- [ ] List + search + muscle-group filter
- [ ] Add custom exercise
- [ ] Archive (history) / hard-delete (custom, no history)

## Phase 2 — Backup ⬜
- [ ] Export (share sheet / download)
- [ ] Import with validation + migrate-forward
- [ ] Last-backup date + 14-day nudge; storage status, app version

## Phase 3 — Workout logging ⬜
- [ ] `domain/sets.ts` + tests (labels, Previous matching, completion)
- [ ] Start / continue / discard; mini-bar while in progress
- [ ] Exercise picker; add/remove/reorder/replace exercises
- [ ] Set table: SET · PREVIOUS · KG · REPS · ✓, set types, swipe-delete, add set
- [ ] Rest timer (per-exercise, persisted `rest_ends_at`, ±15 s, skip)
- [ ] Live duration, volume, set count header
- [ ] Finish flow (incomplete-sets prompt, save sheet with summary)

## Phase 4 — History + edit/delete ⬜
- [ ] History list (cards) + detail
- [ ] Edit finished workout (incl. date / start / duration)
- [ ] Delete workout

## Phase 5 — Plan + calendar + skips ⬜
- [ ] `plan_version` + Plan screen
- [ ] `domain/calendar.ts` + tests
- [ ] Month grid with statuses, day sheet, skip with reason, log past workout
- [ ] Missed-days banner on Today; month summary

## Phase 6 — Progress ⬜
- [ ] `domain/progress.ts` + tests
- [ ] Charts (top weight, e1RM, volume) with range selector
- [ ] PR cards, session history

## Log
- 2026-10-22 — Spec reviewed; renamed to Trust The Process / `ttp`; schema + gotcha fixes.
- 2026-10-22 — Decisions above folded into SPEC; repo connected.
