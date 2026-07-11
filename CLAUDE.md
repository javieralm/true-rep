# TrueRep

Subscription-based calisthenics training platform with multiple trainers, gamification, social challenges, and AI-powered posture feedback. Full spec: `true-rep.md`.

## Quick Start

```bash
pnpm install

# Backend
cd apps/backend
cp .env.example .env.local   # fill in Clerk, Stripe, Supabase, OpenAI, Cloudinary keys
npx prisma migrate dev --name init
npx prisma db seed
pnpm dev                      # localhost:3000

# Mobile (another terminal)
cd apps/mobile
cp .env.example .env
pnpm start                    # scan QR with Expo Go
```

## Commands

- `pnpm dev` (in backend or mobile) — dev server
- `pnpm build` / `pnpm lint` / `pnpm type-check` — per workspace or from root (`pnpm -r`)
- `pnpm test` (backend) — Vitest unit tests
- `npx prisma migrate dev` — create + apply migration
- `npx prisma studio` — DB inspector
- `eas build --platform ios|android` — store builds

## Tech Stack

**Backend:** Next.js 15 + TypeScript + Prisma + PostgreSQL (Supabase) + Stripe + Clerk + OpenAI Vision + Cloudinary
**Mobile:** React Native + Expo (Router) + React Query + Zustand + Supabase Realtime
**Hosting:** Vercel (backend), App Store + Google Play (mobile via EAS)

## Architecture

- `apps/backend/src/app/api/` — API routes (health, routines, workouts, users, challenges, subscriptions, video-feedback, webhooks)
- `apps/backend/src/lib/` — db (Prisma singleton), auth (Clerk helpers), api (response shape + validation), stripe, cloudinary, openai, gamification
- `apps/mobile/src/app/` — Expo Router screens: `(auth)` stack, `(tabs)` navigator, modals (routine-detail, workout-session, challenge-detail, feedback-camera)
- `apps/mobile/src/{hooks,state,components,services}/` — React Query hooks, Zustand stores, UI components, Supabase client
- `packages/shared/` — domain types + Zod validators shared by both apps

### Data Flow
Mobile → API (Clerk Bearer token) → middleware/`requireUser()` validates → Prisma → response `{ data, status, message?, timestamp }` → React Query caches. Real-time (leaderboards) via Supabase channels.

## Reglas No Negociables

1. TypeScript strict; no `any`, no `@ts-ignore`.
2. Every API response uses `{ data, status: 'success'|'error', message?, timestamp }` (helpers in `lib/api.ts`).
3. Schema changes only via Prisma migrations.
4. Protected routes call `requireUser()`/`requireTrainer()`; no token = 401.
5. Mobile UI works at 320px; touch targets ≥ 44px.
6. No secrets in client code; Stripe/Clerk webhook signatures always verified.
7. External API calls (OpenAI, Stripe, Cloudinary) wrapped in try-catch with user-facing errors.
8. Zod validation at every API boundary before touching the DB.
9. Real-time via Supabase subscriptions, not polling (unsubscribe on cleanup).
10. Unit tests for validators + gamification logic (`pnpm test` in backend).

## Design Tokens

Primary `#FF6B35` · Secondary `#004E89` · Accent `#F7B801` · Success `#2ECC71` · Danger `#E74C3C`. Inter font, 4px spacing scale, 8px radius. Mobile tokens in `apps/mobile/src/constants/colors.ts`, web in `apps/backend/src/app/globals.css`.

## Environment Variables

See `apps/backend/.env.example` and `apps/mobile/.env.example`. Backend needs DATABASE_URL, CLERK_SECRET_KEY, CLERK_WEBHOOK_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_MONTHLY/ANNUAL, CLOUDINARY_*, OPENAI_API_KEY. Mobile needs EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY, EXPO_PUBLIC_API_URL, EXPO_PUBLIC_SUPABASE_URL/ANON_KEY.

## Debugging

- Backend: `npx prisma studio`, dev server logs
- Mobile: `pnpm start` logs, shake device in Expo Go
- Auth: Clerk dashboard → Users/Sessions · Payments: Stripe dashboard → Events · Video: Cloudinary Media Library
