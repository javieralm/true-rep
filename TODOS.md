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

## Base de datos conectada (2026-09-28)

Supabase `pbzvtllytonwhbeykyjc`, región `eu-west-3`. Las 11 migraciones aplicadas
y los 7 logros sembrados; verificado con la app arrancada (`/api/routines` → 200).

**Se conecta por el POOLER, no por la conexión directa, y no es opcional:**
`db.pbzvtllytonwhbeykyjc.supabase.co` solo publica registro AAAA (IPv6) y la
máquina de desarrollo no tiene salida IPv6 (`ENETUNREACH` incluso contra
Cloudflare). Esa cadena es inalcanzable aunque la contraseña sea correcta —
falla de una forma que parece un problema de credenciales. El pooler
(`aws-1-eu-west-3.pooler.supabase.com`) sí resuelve por IPv4.

- `DATABASE_URL` → transaction pooler, puerto **6543**, `?pgbouncer=true&connection_limit=1`
- `DIRECT_URL` → session pooler, puerto **5432** (el de transacciones no migra)
- Usuario con sufijo de proyecto: `postgres.pbzvtllytonwhbeykyjc`, no `postgres`
- La contraseña lleva `&` y `+`: van percent-encodeados (`%26`, `%2B`) o la
  cadena se parte por la mitad.

Ambas variables viven **solo en `apps/backend/.env`**. El CLI de Prisma no lee
`.env.local`, así que tenerlas en los dos ficheros hacía posible que la app y
las migraciones apuntasen a bases distintas.

## Minas conocidas antes de desplegar (leer antes de tocar producción)

- **El endpoint de salud es `/api/health`, no `/api/app_status`.** Una entrada
  anterior de este fichero decía que se había renombrado a `app_status`; es
  falso, `/api/app_status` devuelve 404 y `/api/health` devuelve 200.
  Comprobado el 2026-09-28. Apunta ahí el monitoring de uptime.

- **La migración `20260731220000_workout_idempotency_key` falla en cualquier DB
  que ya tenga filas en `workouts`.** Hace `ADD COLUMN "idempotency_key" TEXT
  NOT NULL` sin `DEFAULT`, y Postgres rechaza eso si la tabla no está vacía.
  En una base de datos nueva va bien (las migraciones corren en orden sobre una
  tabla vacía). Si tienes una DB de pruebas con entrenamientos ya guardados,
  `prisma migrate deploy` va a petar ahí: usa una base limpia o borra esas filas.
  No he reescrito la migración a propósito — reescribir una migración ya aplicada
  en algún entorno es peor que el problema.
- ~~`vercel.json` está en la raíz del repo~~ **Corregido el 2026-09-28: era
  falso.** `vercel.json` está en `apps/backend/vercel.json`, que es exactamente
  donde Vercel lo busca con Root Directory = `apps/backend`. El cron horario de
  `/api/cron/reminders` está bien colocado. Aun así, confirma en el dashboard
  que el cron aparece tras el primer deploy: es la única forma de saber que
  Vercel lo registró.
- **No hay icono ni splash de la app** (no existe `apps/mobile/assets/`, y
  `app.json` no referencia ninguno). Expo usará el placeholder por defecto y
  App Store lo rechaza. Hace falta un icono 1024×1024 sin transparencia.
- **`eas.json` lleva URLs de ejemplo** (`truerep.vercel.app`). Cámbialas por el
  dominio real antes del primer build de producción.
- **Los 7 logros apuntan a `/badges/*.png` y no existe `public/`.** Hoy no se
  nota porque la UI muestra nombre y descripción, no la imagen. Si algún día se
  renderizan como iconos, hay que crear los assets.
- **Sin CSP y sin ESLint configurado.** Ambas cosas a propósito: una CSP mal
  puesta rompe Clerk y Stripe en producción sin fallar en build (se añade
  verificando en navegador contra el dominio final), y `next lint` no tiene
  config todavía — no está en CI, así que no bloquea nada.

## Completed

**2026-09-28 — preparación para producción:**
- **`next build` estaba roto y nadie lo sabía**, porque CI no ejecutaba el
  build: solo type-check y tests. Causa: `lib/stripe.ts` y `lib/openai.ts`
  construían el cliente del SDK al importar el módulo, y Next importa cada ruta
  para recolectar metadatos durante el build → el SDK lanzaba por falta de
  apiKey. Efecto secundario: compilar exigía tener los secretos de producción.
  Arreglado con inicialización perezosa; ahora el build pasa con `DATABASE_URL`
  vacío y sin ninguna clave.
- **`pnpm --filter @truerep/backend build` añadido a CI** para que esto no
  vuelva a colarse.
- **`prisma generate` añadido al script de build.** En Vercel no era fiable que
  se generase el cliente en el `install`, y sin cliente el build falla igual que
  fallaba en local.
- **Nuevo `lib/env.ts` con `requireEnv()`**: las variables obligatorias fallan
  nombrando la variable en vez de degradar en silencio con `?? ""`. Eso último
  estaba causando dos fallos latentes: Cloudinary firmaba subidas con un secreto
  vacío (firma inválida, error apareciendo en el móvil lejos de la causa) y el
  webhook de Stripe devolvía "Invalid signature" cuando en realidad faltaba
  `STRIPE_WEBHOOK_SECRET`.
- **Cabeceras de seguridad** en `next.config.ts` (`X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS) y
  `poweredByHeader: false`. No había ninguna.
- **`eas.json` creado** — no existía, así que no se podía hacer un build de
  tienda con perfiles.
- **`FEATURE_CHALLENGES_ENABLED` documentado** en `.env.example`: el código lo
  leía pero no estaba en ningún sitio.
- **Estado verificado:** `pnpm -r type-check` limpio en los 3 workspaces,
  69 tests verdes (antes 47 — `validators.test.ts` no llegaba a ejecutarse
  porque el cliente de Prisma no estaba generado), `next build` con 37 páginas.

**2026-09-28 — coaching SaaS resumen: mapped, executed, and posture feedback deferred:**
Compared an external coaching-SaaS concept (Excel → app, Harbiz-style) against
TrueRep; architecture already matched 1:1, so only the genuinely portable
differentiators got built. See `true-rep.md` §17 for the full before/after.
- **Weight auto-escalado:** `workout-session.tsx` now actually captures
  `felt_like` (easy/medium/hard) and real `reps_done` per exercise — both
  existed in the schema but the UI silently hardcoded `"medium"` and `1`.
  `GET /api/routines/[id]` returns `weight_suggestions` (new
  `lib/progression.ts`): if the last logged set for an exercise felt "easy",
  suggests +1kg; shown to the client in `routine-detail.tsx`. No trainer
  approval workflow — client-facing suggestion only, add the approval loop
  later if it turns out to matter.
- **CSV export for coaches:** `GET /api/clients/[id]/export` + a button on
  `(dashboard)/clients/[id]/page.tsx`. Raw per-set history (date, routine,
  exercise, reps, weight, felt_like, notes, coach feedback). No PDF — CSV
  opens fine in Excel/Sheets and needed zero new dependencies.
- **Deferred, documented, not built:** webhooks/Zapier/Notion automation —
  real new scope (third-party auth, new API surface), not a port. Health app
  integration was already on the Phase 4 roadmap. PWA for the client was
  rejected outright — reverts the existing React Native/Expo decision with no
  new reason to.
- **Separate decision, same session:** AI posture feedback hidden from the UI
  (OpenAI Vision + Cloudinary cost per use) — removed the entry points in
  `profile.tsx` and the dashboard nav; `VideoFeedback` model, `/api/video-
  feedback/*`, `feedback-camera.tsx`, and `/video-review` stay in the repo,
  untouched and reachable only by direct link. Re-enabling is just restoring
  those two links.
- **Tests:** `__tests__/progression.test.ts` covers the suggestion logic and
  CSV cell escaping (8 cases).
- **You need to do:** nothing — no new env vars, no new service signups.
  Everything above runs on infra you already have configured.

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
