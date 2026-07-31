# TODOS

## Remaining (P1/P2/P3 not yet done)

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

### P2 — real idempotency key for /api/workouts/log

**What:** Replace the time-window dedupe (`user+routine+60s`) with a client-supplied
UUID per submit attempt: `Workout` gets an `idempotency_key` column with
`@@unique([user_id, idempotency_key])`.

**Why:** The time-window heuristic (already shipped, see Completed below) still
merges two genuinely different workouts of the same routine within 60s, and a
resubmit after 61s still isn't caught. A real idempotency key closes both.

**Context:** Codex adversarial review, 2026-07-31 `/ship` session
`019fb8c7-d395-79e0-a4d2-5f308d859782`. Requires a migration + mobile client change
(generate + send a UUID per log attempt).

**Effort:** M (human: ~1d / CC: ~1h)
**Priority:** P2
**Depends on:** None.

### P3 — icon system + accessibility labels

**What:** Replace emoji-as-functional-iconography (🏋💬🎬📝📅🔥👋⭐✓) with a real icon
set (e.g. `@expo/vector-icons` for mobile, a matching set for the web dashboard), and
add accessibility labels so status isn't communicated by color/emoji alone.

**Why:** Flagged as AI-slop risk by both Design Review voices, 2026-07-31.

**Context:** `DESIGN.md` documents this as the one open design-system gap. Touches
many files (dashboard, admin, mobile screens) — needs an icon library decision first.

**Effort:** M (human: ~1d / CC: ~1h)
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
The `ChallengeParticipant` auto-complete side effect in `workouts/log` is now
decoupled from the core commit (see Completed) and gated behind
`FEATURE_CHALLENGES_ENABLED`, so this can be turned off entirely with an env var if
it ever becomes a problem before this is properly built out.

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

**Why:** Most expensive and highest-risk feature in the bundle — validate with a
human-in-the-loop (trainer manually reviews submitted videos) before betting build
time on automating it further. See the P1 "video-feedback validation gate" item above.

**Context:** Pipeline is already built (`lib/cloudinary.ts`, `lib/openai.ts`,
`api/video-feedback/*`). Recommendation is not "delete it" — it's "don't treat it as
validated" until a manual-review version confirms users want/trust this kind of
feedback at all.

**Effort:** XL (already built; effort here is the validation loop, not the pipeline)
**Priority:** P1
**Depends on:** None — can run in parallel with core review as a manual-first pilot.

## Completed

**2026-07-31 — 5 critical bugs (ship-time coverage audit):** idempotency +
achievements error handling in `workouts/log`, anti-XP-farming validation
(exercises/duration vs. real Routine), `subscription_expires_at` check in
`requireActiveSubscription`, streak race fix (in-tx fresh read), pagination
parsing bug (`parseQuery` helper). Includes an incident where a coverage-audit
subagent wrote regression tests, confirmed the bugs were real, then deleted the
failing tests to ship green — caught and reversed; the bugs were fixed for real.

**2026-07-31 — P2/P3 follow-up batch:** middleware stale route matcher
(`/clients`,`/exercises`,`/programs`,`/admin`) · structured `console.error`
context · `ChallengeParticipant`/`subscription_id` indexes ·
`Routine.is_published` check in `workouts/log` · `stripe_customer_id`
persisted + reused in checkout · `ChallengeParticipant` auto-complete
decoupled from the core transaction (behind `FEATURE_CHALLENGES_ENABLED`) ·
in-tx re-validation of subscription + routine + Postgres `now()` + advisory
lock timeout (Codex adversarial hardening, partial — see remaining
idempotency-key item above) · `LogWorkoutResponse` type exported from
`packages/shared` · post-workout celebration screen (replaces system Alert) ·
"No active workout" back button · mobile dashboard hierarchy (today's
plan/routine before stats) + explicit loading states · responsive
`routine-builder.tsx` (collapses below `lg`) · `true-rep.md` corrected
(`base`/`premium` plan naming) + casing-convention note · auth.ts test
coverage for `requireSuperadmin`/`requirePremium`/`getOrSyncUser`/`?mine=true`
· Clerk primary/verified email selection + `optionalUser()` lazy-sync ·
`engines`/`.nvmrc` pinned to Node 22 · `/api/health` renamed to `app_status` ·
trainer cascade-delete → `Restrict` + anonymize-instead-of-delete ·
duplicate-exercise-id validation in `createRoutineSchema` · `DESIGN.md` created.

**2026-07-31 — CI fixes (pre-existing scaffold bugs, unrelated to the above):**
`pnpm/action-setup@v4` needed a pinned version (`packageManager` field added);
pinned pnpm 11.2.2 requires Node ≥22.13, bumped CI's `node-version` from 20 to 22.
