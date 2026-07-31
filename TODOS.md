# TODOS

## Scope deferred by /autoplan CEO review (2026-07-31)

Both the Claude CEO subagent and Codex (with web search vs. Freeletics/Centr/Whoop/
Trainerize) converged on: the current working tree bundles 3-4 unvalidated products
into one 5-week MVP. User accepted the recommendation to hold the deep Design/Eng/DX
review to the validated core (single-trainer routines, workout logging, Stripe
paywall/portal, basic gamification, manually-reviewed posture feedback) and defer the
rest here rather than deep-reviewing surface that may get cut. See
`~/.gstack/projects/true-rep/` autoplan session for full CEO dual-voice findings.

**Note (2026-07-31):** the video-feedback pipeline's automation gate (below) has since
shipped — this section now only covers the parts of the deferred bundle that are
still genuinely on hold pending demand (marketplace generalization, live
leaderboards/challenges UI, admin trainer-approval, push/cron re-engagement).

### Admin trainer-approval flow

**What:** `/admin/trainers` page + `api/admin/trainers` routes that let a superadmin
approve new trainer accounts.

**Why:** Only needed once there is more than one trainer. Building curation tooling
before there's trainer supply is solving an ops problem that doesn't exist yet.

**Context:** Code already exists. Not deleted — just not in scope for the deep
tactical review right now. Revisit once a second trainer is being onboarded.

**Effort:** S (already built — revisit means test + review, not build)
**Priority:** P3
**Depends on:** First external trainer signing up.

### Multi-trainer marketplace mechanics

**What:** Full trainer-facing dashboard for managing multiple trainers' clients,
programs, and exercise libraries as a marketplace.

**Why:** Marketplace-before-liquidity is a known failure mode — curation and
multi-sided mechanics matter only once there's real trainer supply and user demand.

**Context:** `(dashboard)/clients`, `(dashboard)/exercises`, `(dashboard)/programs`,
routine-builder already exist. Keep working for the single seed trainer; defer
generalizing it into a self-serve marketplace experience.

**Effort:** L
**Priority:** P2
**Depends on:** Validated demand from the single-trainer core loop.

### Real-time leaderboards / social challenges

**What:** Supabase Realtime-backed leaderboards and social retos (challenges).

**Why:** Empty leaderboards amplify abandonment — gamification needs a user base
first, or the social loop reads as dead on arrival.

**Context:** Schema and hooks (`useLeaderboard`, `useChallenges`) already scaffolded.
The `ChallengeParticipant` auto-complete side effect in `workouts/log` is decoupled
from the core commit (see Completed) and gated behind `FEATURE_CHALLENGES_ENABLED`,
so this can be turned off entirely with an env var if it ever becomes a problem
before this is properly built out.

**Effort:** M
**Priority:** P3
**Depends on:** Minimum viable user cohort (rough bar: 20-30 active users).

### Push notifications + cron reminders

**What:** `lib/expo-push.ts`, `api/me/push-token`, `api/cron/reminders`.

**Why:** Re-engagement infra is premature before the core retention loop (routines +
streak) is proven to retain anyone worth re-engaging.

**Context:** Infra is built and functional. Low cost to keep, but not worth deep
tactical review time until the core loop has real usage data to react to.

**Effort:** S
**Priority:** P3
**Depends on:** Core loop validated.

## Known local environment quirk (not a bug)

Running `pnpm --filter mobile type-check` on this machine surfaces
`'X' cannot be used as a JSX component` errors (`Stack`, `Tabs`, `Ionicons`) coming
from two coexisting `@types/react` versions in the pnpm store (18.3.31 and
19.2.17) — a local hoisting artifact. Confirmed CI (`ci.yml`, clean install) does
NOT reproduce this; `apps/mobile type-check: Done` with zero errors there. Don't
chase this locally — trust CI. If it starts failing in CI too, that's the signal
to actually investigate (likely needs a pnpm `overrides` pin on `@types/react`).

## Completed

**2026-07-31 — 5 critical bugs (ship-time coverage audit):** idempotency +
achievements error handling in `workouts/log`, anti-XP-farming validation
(exercises/duration vs. real Routine), `subscription_expires_at` check in
`requireActiveSubscription`, streak race fix (in-tx fresh read), pagination
parsing bug (`parseQuery` helper). Includes an incident where a coverage-audit
subagent wrote regression tests, confirmed the bugs were real, then deleted the
failing tests to ship green — caught and reversed; the bugs were fixed for real.

**2026-07-31 — P2/P3 follow-up batch (PR #2):** middleware stale route matcher
(`/clients`,`/exercises`,`/programs`,`/admin`) · structured `console.error`
context · `ChallengeParticipant`/`subscription_id` indexes ·
`Routine.is_published` check in `workouts/log` · `stripe_customer_id`
persisted + reused in checkout · `ChallengeParticipant` auto-complete
decoupled from the core transaction (behind `FEATURE_CHALLENGES_ENABLED`) ·
in-tx re-validation of subscription + routine + Postgres `now()` + advisory
lock timeout (Codex adversarial hardening) · `LogWorkoutResponse` type
exported from `packages/shared` · post-workout celebration screen (replaces
system Alert) · "No active workout" back button · mobile dashboard hierarchy
(today's plan/routine before stats) + explicit loading states · responsive
`routine-builder.tsx` (collapses below `lg`) · `true-rep.md` corrected
(`base`/`premium` plan naming) + casing-convention note · auth.ts test
coverage for `requireSuperadmin`/`requirePremium`/`getOrSyncUser`/`?mine=true`
· Clerk primary/verified email selection + `optionalUser()` lazy-sync ·
`engines`/`.nvmrc` pinned to Node 22 · `/api/health` renamed to `app_status` ·
trainer cascade-delete → `Restrict` + anonymize-instead-of-delete ·
duplicate-exercise-id validation in `createRoutineSchema` · `DESIGN.md` created.

**2026-07-31 — remaining P1/P2/P3 batch:**
- **P1 — video-feedback trainer-review gate:** `AnalysisStatus` gained
  `PENDING_TRAINER_REVIEW`; `analyze/route.ts` no longer auto-triggers OpenAI
  Vision — a trainer must approve via the new `POST /video-feedback/[id]/review`
  (dashboard page `/video-review`, `GET /video-feedback/pending-review` for the
  queue) before analysis runs. Mobile `feedback-camera.tsx` updated to reflect
  the "awaiting trainer review" wait state instead of timing out.
- **P2 — real idempotency key:** `Workout.idempotency_key` (nullable,
  `@@unique([user_id, idempotency_key])`) replaces the time-window heuristic as
  the primary dedupe mechanism when the client sends one; mobile
  `workout-session.tsx` generates a UUID per save attempt (stable across
  retries of the same attempt, via `crypto.randomUUID()`) and resends it on
  retry. Time-window dedupe kept as a fallback for clients that don't send a key.
- **P3 — icon system + accessibility:** mobile tab bar and dashboard
  "today's task" icons now use `@expo/vector-icons` (Ionicons) instead of
  emoji; achievement badges show an explicit "(locked)" label + accessibility
  label instead of relying on opacity/color alone. Decorative emoji (🎉 👋 🔥
  ⭐ next to already-labeled text) intentionally left as-is — the flagged
  AI-slop risk was emoji-as-the-only-signal, not decorative flourish.

**2026-07-31 — CI fixes (pre-existing scaffold bugs, unrelated to the above):**
`pnpm/action-setup@v4` needed a pinned version (`packageManager` field added);
pinned pnpm 11.2.2 requires Node ≥22.13, bumped CI's `node-version` from 20 to 22.
