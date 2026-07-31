# TODOS

## Follow-up from /ship (2026-07-31) — remaining /autoplan tasks not in this PR

This PR shipped only the 5 critical fixes surfaced by the ship-time coverage audit
(idempotency + achievements error handling, anti-XP-farming validation, subscription
expiry check, streak race fix, pagination parsing bug). The 23 other tasks from the
/autoplan review are tracked here for a follow-up ship.

### P1 — mobile UX (not shipped this PR)

**What:** Loading/error states for `useUser`/`useRoutines`/`useSchedule`/`useAchievements`,
and a back button on the "No active workout" dead end in `workout-session.tsx`.

**Why:** A user with real XP/streak currently sees "0 XP" flash on every screen mount
(loading is indistinguishable from zero data) — a perception bug, not just polish.

**Context:** Design Review (Fase 2 of the 2026-07-31 /autoplan run) flagged both as P1.
Deferred here only because this ship's scope was the 5 critical backend bugs.

**Effort:** S (human: ~4h / CC: ~30min combined)
**Priority:** P1
**Depends on:** None.

### P1 — video-feedback validation gate

**What:** Add a `PENDING_TRAINER_REVIEW` state to `AnalysisStatus` so a trainer
manually reviews submitted videos before the OpenAI Vision pipeline auto-analyzes them.

**Why:** CEO Review (0C-bis): the AI posture-feedback pipeline is the most expensive,
least-validated, highest-risk piece of the product — validate manually before trusting
it at scale.

**Context:** `packages/shared/src/types/domain.ts` (AnalysisStatus enum),
`apps/backend/src/app/api/video-feedback/analyze/route.ts` (currently auto-runs
`analyzeForm()` immediately on upload).

**Effort:** M (human: ~1d / CC: ~15min)
**Priority:** P1
**Depends on:** None.

### P2 — harden workouts/log idempotency + transaction boundaries (Codex adversarial, 2026-07-31)

**What:** Codex's adversarial pass on the 5-bug fix flagged real limitations in the
fix, ranked by what's actually worth doing:
1. Replace the time-window dedupe (`user+routine+60s`) with a real idempotency
   key: client sends a UUID per submit attempt, `Workout` gets a
   `idempotency_key` column with `@@unique([user_id, idempotency_key])` —
   closes both the "two legit workouts within 60s get merged" false-positive
   and the "wait 61s, resubmit" farming path. Requires a migration.
2. Re-validate `requireActiveSubscription` from the fresh in-transaction user
   read, not just the pre-transaction snapshot (closes a narrow
   cancel-during-lock-wait TOCTOU window).
3. Add an explicit lock timeout to `pg_advisory_xact_lock` (it waits
   indefinitely by default) so a stuck request can't hold a connection forever.
4. Use Postgres' `now()` instead of the app server's `new Date()` for
   `completed_at`/streak comparisons — removes the (very narrow) window where
   a delayed request's clock disagrees with lock-acquisition order.
5. Re-read (or version) the routine inside the transaction so a trainer
   editing/deleting a routine mid-flight can't validate a workout against a
   definition that no longer exists.

**Why:** None of these are as severe as the 5 bugs actually fixed (which had
zero protection at all) — see `## Corrections to Codex's claims` below for two
points that are NOT valid — but they're real, cheap-ish hardening for when this
core sees production traffic beyond a single trainer.

**Context:** Full Codex output captured during the 2026-07-31 `/ship` adversarial
review, session id `019fb8c7-d395-79e0-a4d2-5f308d859782`.

**Effort:** M (item 1, needs a migration) + S (items 2-5) — human: ~1d / CC: ~1-2h
**Priority:** P2
**Depends on:** None.

**Corrections to Codex's claims (verified, not acted on):**
- Codex said `subscription_expires_at: null` should "fail closed" (reject).
  This is WRONG: `null` is the normal state for the window between
  `checkout.session.completed` (sets status=ACTIVE) and
  `customer.subscription.updated` (sets expires_at) — failing closed here would
  reject every brand-new subscriber immediately after paying.
- Codex said achievement-check failures are "permanently silent." This
  overstates it: `gamification.checkAchievements()`'s unlock conditions
  (workout count, streak, XP thresholds) are monotonic — once true they stay
  true — so a transient failure just delays the achievement to the next
  workout that re-triggers the same check, it doesn't lose it permanently
  (skipDuplicates on UserAchievement prevents double-award once it does land).

### P2 — auth.ts test coverage gaps (found by /ship's Testing specialist, 2026-07-31)

**What:** `requireSuperadmin()`, `requirePremium()`, `getOrSyncUser()`, and the
`?mine=true` branch of `GET /api/routines` have zero test coverage, including
their denied/rejection paths.

**Why:** A regression in any of these (e.g. flipping `!user.is_superadmin`, or
dropping the `trainer_id` filter on `?mine=true`) would ship silently — no test
would catch it. Not a bug today, but a real coverage gap on security-relevant code.

**Context:** Found during the pre-landing specialist review for the 2026-07-31
ship of the 5 critical-bug fixes. Not part of that fix's scope, so deferred here.

**Effort:** S (human: ~2h / CC: ~20min)
**Priority:** P2
**Depends on:** None.

### P2 — 13 items from Eng/Design/DX review

middleware `isDashboardRoute` stale matcher · unstructured `console.error` logging ·
`ChallengeParticipant` index · `subscription_id` index · `Routine.is_published` check in
workouts/log · persist `stripe_customer_id` · decouple `ChallengeParticipant` update from
the core write path · post-workout celebration screen (replace system alert) · mobile
dashboard hierarchy (CTA before stats) · responsive breakpoints for `routine-builder.tsx`
· update `true-rep.md` (base/premium, uppercase difficulty) or auto-generate from Zod ·
export `LogWorkoutResponse` type from `packages/shared`. Full detail with file paths in
the 2026-07-31 /autoplan session (`~/.gstack/projects/true-rep/tasks-*-review-*.jsonl`).

**Effort:** varies, all S-M individually
**Priority:** P2
**Depends on:** None.

### P3 — 7 items from Eng/Design/DX review

Trainer cascade-delete → soft-delete decision · `Routine.exercises` referential
integrity · Clerk primary/verified email selection · replace emoji icons with icon set
· minimal `DESIGN.md` · accessibility labels on icons · pin Node `engines`/`.nvmrc` ·
rename `/api/health`'s internal `status` field. Full detail in the same JSONL task
files referenced above.

**Effort:** varies, all S-M individually
**Priority:** P3
**Depends on:** None.

## Scope deferred by /autoplan CEO review (2026-07-31)

Both the Claude CEO subagent and Codex (with web search vs. Freeletics/Centr/Whoop/
Trainerize) converged on: the current working tree bundles 3-4 unvalidated products
into one 5-week MVP. User accepted the recommendation to hold the deep Design/Eng/DX
review to the validated core (single-trainer routines, workout logging, Stripe
paywall/portal, basic gamification, manually-reviewed posture feedback) and defer the
rest here rather than deep-reviewing surface that may get cut. See
`~/.gstack/projects/true-rep/` autoplan session for full CEO dual-voice findings.

### Admin trainer-approval flow

**What:** `/admin/trainers` page + `api/admin/trainers` routes that let a superadmin
approve new trainer accounts.

**Why:** Only needed once there is more than one trainer. Building curation tooling
before there's trainer supply is solving an ops problem that doesn't exist yet.

**Context:** Code already exists (`apps/backend/src/app/admin/trainers/page.tsx`,
`api/admin/trainers/route.ts`, `api/admin/trainers/[id]/route.ts`). Not deleted — just
not in scope for the deep tactical review right now. Revisit once a second trainer is
being onboarded.

**Effort:** S (already built — revisit means test + review, not build)
**Priority:** P3
**Depends on:** First external trainer signing up.

### Multi-trainer marketplace mechanics

**What:** Full trainer-facing dashboard for managing multiple trainers' clients,
programs, and exercise libraries as a marketplace.

**Why:** Marketplace-before-liquidity is a known failure mode — curation and
multi-sided mechanics matter only once there's real trainer supply and user demand.
Both review voices flagged this as the biggest strategic risk in the current build.

**Context:** `(dashboard)/clients`, `(dashboard)/exercises`, `(dashboard)/programs`,
routine-builder already exist. Keep working for the single seed trainer; defer
generalizing it into a self-serve marketplace experience.

**Effort:** L
**Priority:** P2
**Depends on:** Validated demand from the single-trainer core loop.

### Real-time leaderboards / social challenges

**What:** Supabase Realtime-backed leaderboards and social retos (challenges).

**Why:** Empty leaderboards amplify abandonment (Codex finding) — gamification needs
a user base first, or the social loop reads as dead on arrival.

**Context:** Schema and hooks (`useLeaderboard`, `useChallenges`) already scaffolded.
Keep the schema; hold off building the live UI until there's a cohort large enough
for a leaderboard to mean something.

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

### Automated AI posture feedback (OpenAI Vision pipeline)

**What:** `video-feedback/upload-url` → Cloudinary signed upload → `analyze` → OpenAI
Vision → keyframes → status pipeline.

**Why:** Most expensive and highest-risk feature in the bundle (variable camera
angles, exercise execution variability, injury/trust risk if wrong) — and it's the
one genuinely differentiated part of the product. Both review voices recommend
validating with a human-in-the-loop (trainer manually reviews submitted videos)
before betting build time on automating it.

**Context:** Pipeline is already built (`lib/cloudinary.ts`, `lib/openai.ts`,
`api/video-feedback/*`). Recommendation is not "delete it" — it's "don't treat it as
validated" until a manual-review version confirms users want/trust this kind of
feedback at all.

**Effort:** XL (already built; effort here is the validation loop, not the pipeline)
**Priority:** P1
**Depends on:** None — can run in parallel with core review as a manual-first pilot.
