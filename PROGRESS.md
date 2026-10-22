# Progress — Trust The Process (TTP)

Phases from SPEC §9. ✅ = built and verified on desktop (mobile viewport); 📱 = confirmed on iPhone.
Live URL: https://crusaderrrr.github.io/

## Decisions
- 2026-10-22 — Hevy-style logging: per-set ✓ completion, Previous column, rest timer, live duration.
- 2026-10-22 — Edit/delete finished workouts in v1.
- 2026-10-22 — History tab in v1.
- 2026-10-22 — Set types now: normal / warmup / drop / failure (`set_type`).
- 2026-10-22 — Hosted as user site `Crusaderrrr.github.io` → base `/`.
- 2026-10-22 — Build all phases continuously; owner tests on iPhone and sends corrections.

## Phase 0 — Skeleton + persistence gate ✅ 📱
- [x] Repo, Pages via GitHub Actions, Vite/React/TS/Tailwind, HashRouter, tab bar
- [x] DB worker (`opfs-sahpool`, pool `ttp`) + RPC + migration 1, "open elsewhere" screen
- [x] `domain/dates.ts` + tests, PWA config, deploy workflow
- [x] iPhone: installed, launch counter persists

## Phase 1 — Exercise library ✅
- [x] List + search + muscle-group filter
- [x] Add custom exercise (also from the workout picker)
- [x] Archive (history) / hard-delete (custom, no history); archived list + unarchive

## Phase 2 — Backup ✅
- [x] Export (share sheet on iOS / download elsewhere) as `ttp-YYYY-MM-DD.sqlite3`
- [x] Import with header + `user_version` validation, migrate-forward, reload
- [x] Last-backup date + 14-day nudge (Settings and Today); storage status, build time

## Phase 3 — Workout logging ✅
- [x] `domain/sets.ts` + `domain/workout.ts` + tests
- [x] Start / continue / discard; mini-bar while in progress; minimize
- [x] Multi-select exercise picker; remove / move / replace exercises
- [x] Set table: SET · PREVIOUS · KG · REPS · ✓, set types, swipe/menu delete, add set (pre-fill)
- [x] Rest timer (per-exercise setting, persisted `rest_ends_at`, ±15 s, skip, beep + flash)
- [x] Live duration, volume, set count header
- [x] Finish flow (incomplete-sets prompt, save sheet with summary + PR count)

## Phase 4 — History + edit/delete ✅
- [x] History cards (duration, volume, PRs, exercises) + detail
- [x] Edit finished workout (title, date, start time, minutes, notes, sets)
- [x] Delete workout

## Phase 5 — Plan + calendar + skips ✅
- [x] `plan_version` + Plan screen
- [x] `domain/calendar.ts` + tests
- [x] Month grid (arrows + swipe), day sheet, skip with reason, log past workout
- [x] Missed-days banner on Today (last 14 days); month summary + reasons

## Phase 6 — Progress ✅
- [x] `domain/progress.ts` + tests
- [x] Charts (top weight, e1RM, volume) with 1M / 3M / 1Y / All
- [x] PR cards, session history

## Feedback round 1 (2026-10-22) ✅
- [x] Gap between the workout header and the first exercise
- [x] Log Workout header pinned (header outside the scrolling body)
- [x] Rest timer Skip button green
- [x] Set-type menu: first item no longer clipped; W / D / F letters in yellow / blue / red
- [x] Favourite exercises (★) + Favourites section in Exercises and the picker (migration 2)
- [x] Muscle-group icons on exercises (drawn SVG per muscle group; no image column needed)
- [x] **Data-loss fix**: `preserveOnInitFailure: true` (see SPEC §7)

## Feedback round 2 (2026-10-22) ✅
- [x] Exercise photos (free-exercise-db, public domain) for all 52 seed exercises, bundled offline
- [x] Own photo for any exercise (new-exercise sheet + progress page), stored in DB (migration 3)
- [x] Hevy-style illustrations need a paid license — not used (owner chose free photos)
- [x] DB install retries; stress-tested close→reopen cycles and tab takeover without data loss

## Feedback round 3 (2026-10-22) ✅
- [x] Pages no longer rubber-band off-screen on iOS (document pinned; only content scrolls)
- [x] Grip selector (wide / normal / narrow / parallel wide / parallel normal) on grip exercises,
      remembered per exercise, matched in Previous, shown in History, filterable in Progress
- [x] Bottom sheets portal to <body> so the tab bar can't cover them on iOS
- [x] UI redesign: Material Symbols (filled) icons everywhere, cards, page headers, grouped
      Settings rows, Today week strip + last workout, floating rest bar, area chart with metric tabs

## Not verified yet
- iPhone check of Phases 1–6 (owner).
- Rest-timer beep on iOS (Web Audio is muted while the ringer switch is on silent).
- Missed-day banner end-to-end (needs a plan older than the missed day; logic is unit tested).

## Log
- 2026-10-22 — Spec reviewed; renamed to Trust The Process / `ttp`; schema + gotcha fixes.
- 2026-10-22 — Decisions above folded into SPEC; repo connected.
- 2026-10-22 — Phase 0 implemented and confirmed on iPhone.
- 2026-10-22 — Phases 1–6 implemented. E2E in Chrome (390×844): logging, reload mid-workout,
  finish flow, PRs, history edit, calendar/plan/skip, charts, export → delete → import restore.
