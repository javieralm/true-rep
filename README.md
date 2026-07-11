# TrueRep

Plataforma de entrenamiento de calistenia por suscripción: rutinas de múltiples entrenadores (3 niveles), gamificación (XP, rachas, logros), retos sociales con leaderboards en tiempo real y feedback de postura con IA.

Monorepo pnpm:

- **`apps/backend`** — Next.js 15: API + dashboard de entrenadores + landing. Prisma (PostgreSQL/Supabase), Clerk (auth), Stripe (suscripciones), Cloudinary (video), OpenAI Vision (análisis de forma).
- **`apps/mobile`** — Expo / React Native: app iOS + Android con Expo Router, React Query, Zustand y Supabase Realtime.
- **`packages/shared`** — Tipos de dominio y validadores Zod compartidos.

## Puesta en marcha

```bash
pnpm install

# Backend
cd apps/backend
cp .env.example .env.local        # añade tus claves (Clerk, Stripe, Supabase, OpenAI, Cloudinary)
npx prisma migrate dev --name init
npx prisma db seed                # logros iniciales
pnpm dev                          # http://localhost:3000

# Móvil (otra terminal)
cd apps/mobile
cp .env.example .env
pnpm start                        # escanea el QR con Expo Go
```

Cuentas necesarias (todas con tier gratuito): [Supabase](https://supabase.com), [Clerk](https://clerk.com), [Stripe](https://stripe.com), [Cloudinary](https://cloudinary.com), [OpenAI](https://platform.openai.com).

## Tests y verificación

```bash
pnpm -r type-check   # TypeScript strict en los 3 workspaces
cd apps/backend && pnpm test   # validadores + lógica de gamificación
```

## Documentación

- `true-rep.md` — blueprint completo (specs, API, modelo de datos, plan de 5 semanas)
- `CLAUDE.md` — guía para builders (arquitectura, reglas, comandos)
