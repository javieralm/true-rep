# Plan: cobro con Stripe Connect (fases B y C)

Plan para ejecutar en una sesión con el servidor MCP de Stripe cargado
(`plugin:stripe:stripe`). Escrito el 2026-09-29, después de desplegar la fase A.

## 0. Primero, en la sesión nueva

1. Comprobar que las herramientas MCP de Stripe están disponibles (`stripe_implementation_planner`).
2. Llamar a `stripe_implementation_planner` con el contexto de la sección 1, tal cual.
3. Contrastar su respuesta con este plan. Si discrepa en algo (nombres de campos de
   Accounts v2, eventos, parámetros de Checkout), **manda el planificador**: corregir
   este documento en la misma sesión antes de escribir código y avisar al usuario
   de lo que cambia.
4. Confirmar con el MCP que la cuenta tiene **Connect activado** y que se trabaja en
   **modo de pruebas**. No tocar modo live hasta el paso 7.

### Resultado del planificador (2026-09-29, entorno de prueba `acct_1UKwyqRh3hzEOCZE`)

Confirma el plan: plataforma **SaaS con direct charges**, Stripe cobra sus comisiones
al entrenador y asume las pérdidas, panel completo, Checkout alojado en modo
suscripción, portal del cliente, reintentos automáticos de Stripe para pagos fallidos.
Connect está activo en pruebas (plataforma en ES). Correcciones al plan:

- **Accounts v2, nombres exactos:** `dashboard: "full"`,
  `defaults.responsibilities.fees_collector: "stripe"`,
  `defaults.responsibilities.losses_collector: "stripe"`,
  `configuration.merchant.capabilities.card_payments.requested: true`,
  `identity.country`, `contact_email`. "Puede cobrar" =
  `configuration.merchant.capabilities.card_payments.status === "active"`
  (leer con `include: ["configuration.merchant"]`).
- **Eventos de la cuenta:** son eventos v2 "thin" (`v2.core.account[requirements].updated`,
  `v2.core.account[configuration.merchant].capability_status_updated`), que llegan
  por un **event destination** propio, no por el endpoint de webhooks v1. Mientras
  tanto, `GET /api/stripe/connect/status` relee la cuenta al volver del alta y al
  abrir "Cobros", que basta para B1.
- **Cuota de efectivo (fase C, 5.4):** el planificador recomienda cobrarla como
  "SaaS fee": añadir la configuración `customer` a la cuenta v2 del entrenador y
  crear la suscripción de plataforma con `customer_account: <acct del entrenador>`,
  **no** un `Customer` v1 aparte.
- **Comisión:** `application_fee_percent` en la suscripción (equivalente al
  `application_fee_amount` que menciona para cargos sueltos).
- **Entrenadores de otros países:** comprobado en pruebas (2026-09-29): desde la
  plataforma ES se crea una cuenta DK con esta configuración, su enlace de alta y
  un precio trimestral en DKK en su cuenta.

### Estado (2026-09-29)

- **B1 hecha y desplegada** (`5dcca6e`): alta del entrenador, estado de la cuenta,
  precios y página "Cobros". Un único endpoint `POST /api/stripe/connect/onboarding-link`
  crea la cuenta y el enlace; el `refresh_url` es `/billing?refresh=1`.
- **B2 escrita:** `/api/me/billing` (+ `/checkout`, `/portal`), webhook
  `/api/webhooks/stripe-connect`, `evaluateAccess` con la suscripción de la relación,
  pantalla de pago en el móvil y "Gestionar pago" en Perfil, página `/pago` de vuelta.
  Retirados `api/subscriptions/*`, `planPrices`, `priceToPlan`, `STRIPE_PRICE_*`.
  Decisiones: el webhook solo escucha `customer.subscription.*` (traen el estado
  completo; un pago fallido llega como `past_due`/`unpaid`); sin destino de eventos
  v2 de cuentas: el checkout comprueba en directo si el entrenador puede cobrar.
  La comisión usa tramos fijos en `lib/commission.ts` hasta la fase C. El portal usa
  la configuración por defecto de la cuenta del entrenador (sin cambio de
  periodicidad: se cambia cancelando y volviendo a pagar).
- **C escrita:** `PlatformSettings` (tramos + cuota, fila única sembrada en la
  migración), `lib/trainer-billing.ts` → `syncTrainerBilling()` idempotente, lanzado
  con `after()` al aceptar una invitación, al cambiar un cliente (PATCH), al cambiar
  el porcentaje propio y al guardar los ajustes. Cuota: suscripción en la cuenta de
  TrueRep con `customer_account`, factura por email (`send_invoice`, 14 días), sin
  prorrateo. Entrenador solo-efectivo: se le crea una cuenta v2 solo con la
  configuración `customer` (sin alta); si luego conecta Stripe, el alta le añade la
  parte `merchant` a esa misma cuenta (comprobado en pruebas). `/admin/trainers`:
  tramos, cuota y porcentaje propio.
- **Pendiente:** paso a live (sección 7).

## 1. Contexto de negocio (para el planificador)

TrueRep es una plataforma de entrenamiento de calistenia. Cada **entrenador**
(persona independiente, en cualquier país) tiene sus **clientes**, a los que invita
por email. El cliente paga al entrenador de una de dos formas:

- **Stripe**: suscripción recurrente al entrenador, con el **precio y la moneda que
  fija cada entrenador** (EUR, DKK…) y periodicidad **mensual, trimestral o anual**
  (cada una opcional, para hacer ofertas).
- **Efectivo**: fuera de Stripe; el entrenador activa y pausa el acceso a mano.

TrueRep cobra una **comisión** por cada pago con Stripe:

- Tramos por defecto según clientes activos del entrenador: **10 % (1–10), 8 %
  (11–30), 6 % (31+)**. Los tramos se guardan como configuración editable.
- **Porcentaje propio por entrenador** opcional, que fija el superadmin (ofertas).
- Por cada **cliente en efectivo activo**, el entrenador paga a TrueRep una **cuota
  mensual** (ejemplo 2 €/cliente), **editable** por el superadmin.

Decisiones ya tomadas con el usuario:

- **Cobro directo al entrenador** (direct charges): la suscripción, el cliente de
  Stripe y los precios viven en la cuenta conectada del entrenador. Stripe asume el
  riesgo de pérdidas; el entrenador tiene el panel de Stripe completo.
- **Las comisiones de Stripe las paga el entrenador**; la de TrueRep va aparte
  (`application_fee_percent`).
- Alta del entrenador con el **onboarding alojado por Stripe**, nunca propio.
- Un cliente, un entrenador.
- El pago del cliente se abre en el **navegador**, no dentro de la app (excepción
  3.1.3(d) de Apple para servicios persona a persona).

## 2. Estado actual del código

Ya desplegado en `main` (commits `3f384eb` … `79cc6ea`):

- **Relación entrenador–cliente**: modelo `TrainerClient` (`apps/backend/prisma/schema.prisma`),
  con `status` (INVITED/ACTIVE/PAUSED/ENDED), `billing` (STRIPE/CASH), `paid_until`.
- **Acceso**: `evaluateAccess()` y `clientRelation()` en `apps/backend/src/lib/access.ts`;
  `requireClientAccess()` en `apps/backend/src/lib/auth.ts`; `GET /api/me/access`.
  La rama `billing === "STRIPE"` mira **hoy** `user.subscription_status` /
  `user.subscription_expires_at` (planes Base/Premium antiguos). **La fase B la
  cambia** para mirar la suscripción de la relación.
- **Dashboard**: `apps/backend/src/app/(dashboard)/clients/page.tsx` (invitar, pausar,
  forma de pago); endpoints `GET/POST /api/clients`, `PATCH/DELETE /api/client-relations/[id]`.
- **Stripe actual (a sustituir)**: `apps/backend/src/lib/stripe.ts` (SDK `stripe@^17`,
  API `2024-11-20.acacia`, precios fijos `STRIPE_PRICE_BASE/PREMIUM`),
  `api/subscriptions/checkout`, `api/subscriptions/portal`, `api/webhooks/stripe`
  (solo `checkout.session.completed`, `customer.subscription.updated/deleted`, sin
  deduplicar eventos). La app móvil ya **no** tiene pantalla de pago (se quitó en la
  fase A).
- **Móvil**: la puerta de acceso está en `apps/mobile/src/app/(tabs)/_layout.tsx` +
  `components/AccessBlocked.tsx` (estado `payment_required` → "Pago pendiente").

## 3. Fase B1 — alta del entrenador y sus precios

**Esquema (migración nueva, a mano en `prisma/migrations/`, como las anteriores):**

- `User` (entrenador): `stripe_account_id String? @unique`,
  `stripe_charges_enabled Boolean @default(false)`,
  `commission_percent_override Decimal? @db.Decimal(5,2)`.
- `TrainerPrice`: `id`, `trainer_id`, `interval` (enum `MONTH | QUARTER | YEAR`),
  `amount` (Int, unidades mínimas), `currency` (String, ISO en minúsculas),
  `stripe_price_id`, `active Boolean`, `created_at`. Índice `(trainer_id, active)`.
- `StripeEvent`: `id` (= `event.id`), `type`, `received_at`. Para no procesar dos
  veces el mismo evento.

**Backend:**

1. Actualizar el SDK `stripe` a la última versión y la API a la última
   (`2026-05-27.dahlia` según la guía). Revisar el webhook existente: en APIs
   recientes `current_period_end` está en los items de la suscripción, no en ella.
2. `POST /api/stripe/connect/account` (requireTrainer): crea la cuenta conectada con
   **Accounts v2** (`stripe.v2.core.accounts.create`): panel completo, pérdidas y
   comisiones de Stripe a cargo de Stripe/entrenador (direct charges), capacidad de
   pagos con tarjeta solicitada, país y email del entrenador. Guarda `stripe_account_id`.
   **Nombres exactos de campos: sacarlos del planificador** (controller /
   `defaults.responsibilities` / `configuration.merchant`).
3. `POST /api/stripe/connect/onboarding-link`: enlace de alta (v2 account links) con
   `refresh_url` y `return_url` al dashboard (`/billing`).
4. `GET /api/stripe/connect/status`: lee la cuenta y actualiza `stripe_charges_enabled`.
5. `GET/PUT /api/trainer/prices`: el entrenador guarda hasta 3 precios (uno por
   periodicidad) y una moneda. Al cambiar un importe: crear `Price` nuevo en su
   cuenta (`stripeAccount`), desactivar el anterior (`active: false`), dejar a los
   suscriptores existentes en su precio. Un único `Product` por entrenador en su cuenta.
   Validación Zod en `packages/shared/src/validators` (monedas admitidas, importes > 0).

**Dashboard:** página nueva `apps/backend/src/app/(dashboard)/billing/page.tsx`
("Cobros"): estado de la cuenta (sin conectar / alta pendiente / puede cobrar), botón
"Conectar Stripe", formulario de precios y moneda. Añadir `/billing(.*)` al matcher
de `src/middleware.ts` (hay nota allí: rutas del dashboard nuevas deben añadirse).

## 4. Fase B2 — pago del cliente, avisos y acceso

**Esquema:** en `TrainerClient`: `stripe_customer_id String?`,
`stripe_subscription_id String? @unique`, `subscription_status String?`,
`current_period_end DateTime?`, `price_id String?`.

**Backend:**

1. `GET /api/me/billing` (cliente): precios activos de su entrenador (para elegir
   periodicidad) y estado de su suscripción.
2. `POST /api/me/billing/checkout` { interval }: Checkout Session **en la cuenta del
   entrenador** (`stripeAccount: trainer.stripe_account_id`), `mode: "subscription"`,
   `subscription_data.application_fee_percent = comisionActual(trainer)`,
   `metadata.trainer_client_id`, reutilizando `stripe_customer_id` si existe.
   **Nunca pasar `payment_method_types`.** 409 si el entrenador no puede cobrar aún o
   la relación no es `billing: STRIPE`.
3. `POST /api/me/billing/portal`: portal del cliente en la cuenta del entrenador.
4. **Webhook de Connect** (`api/webhooks/stripe-connect/route.ts`, secreto propio
   `STRIPE_CONNECT_WEBHOOK_SECRET`): firma verificada siempre; deduplicar con
   `StripeEvent`; `event.account` identifica al entrenador. Eventos:
   `checkout.session.completed`, `customer.subscription.created/updated/deleted`,
   `invoice.paid`, `invoice.payment_failed`, y los eventos v2 de la cuenta
   (requisitos / capacidad de pagos) para `stripe_charges_enabled`.
5. `evaluateAccess`: la rama STRIPE pasa a usar
   `relation.subscription_status ∈ {active, trialing, past_due}` y
   `current_period_end`. Mantener la regla antigua (`user.subscription_*`) solo
   para relaciones sin `stripe_subscription_id` (clientes migrados con plan viejo)
   hasta que se pasen. Actualizar `__tests__/access.test.ts`.

**Móvil:** en `AccessBlocked` con `payment_required` y `billing === "STRIPE"`:
elegir periodicidad (precios del entrenador) → abrir Checkout con
`WebBrowser.openBrowserAsync` (ver el comentario del antiguo `useSubscription.ts` en
git sobre por qué no `Linking.openURL`) → al volver, `refetch` de `/me/access`.
En Perfil: "Gestionar pago" → portal.

**Retirar lo antiguo:** `STRIPE_PRICE_BASE/PREMIUM`, `planPrices`, `priceToPlan`,
`api/subscriptions/checkout`. Las suscripciones antiguas se cancelan al final del
periodo cuando el cliente ya tenga la nueva (no cortar a nadie).

## 5. Fase C — comisión y cuota de efectivo

1. Tabla `PlatformSettings` (una fila, editable desde `/admin`):
   `commission_tiers Json` (por defecto `[{max:10,pct:10},{max:30,pct:8},{max:null,pct:6}]`)
   y `cash_client_fee` (importe + moneda, por defecto 2 € / mes).
2. `comisionActual(trainer)` en `lib/commission.ts`: override del entrenador si
   existe; si no, tramo según sus clientes `ACTIVE`. **Función pura + tests.**
3. Recalcular y, si cambia, `subscriptions.update(id, { application_fee_percent },
   { stripeAccount })` en todas sus suscripciones cuando: un cliente pasa a/deja de
   ser ACTIVE, cambia el override o cambian los tramos.
4. Cuota de efectivo: suscripción del entrenador en la cuenta de **TrueRep**
   (cliente de plataforma) con un precio por unidad y `quantity` = clientes en efectivo
   activos; actualizar `quantity` al activar/pausar/finalizar uno. Consultar al
   planificador si hay una forma mejor (p. ej. facturar la cuota contra su cuenta
   conectada).
5. `/admin`: editar tramos, cuota y override por entrenador.

## 6. Verificación en cada fase

- `pnpm type-check`, `pnpm lint` y tests en `apps/backend` (vitest) y `apps/mobile` (jest).
- Tests nuevos obligatorios (regla 10 de CLAUDE.md): validadores de precios y
  checkout, `evaluateAccess` con suscripción de relación, `comisionActual`, y el
  webhook de Connect (firma inválida → 400, evento repetido → no reprocesa,
  `invoice.payment_failed` → corta acceso cuando la suscripción deja de estar activa).
- Prueba de punta a punta en **modo de pruebas**: alta de un entrenador de prueba,
  precio en DKK y en EUR, invitar un cliente con Stripe, pagar con tarjetas de
  prueba (`stripe:test-cards`), fallo de pago, cancelación desde el portal, cambio
  de tramo de comisión reflejado en la suscripción.

## 7. Despliegue (mismo procedimiento que la fase A)

1. Variables en Vercel: clave **restringida** (`rk_…`) de pruebas primero,
   `STRIPE_CONNECT_WEBHOOK_SECRET`, y registrar el endpoint de Connect en Stripe.
2. `npx prisma migrate deploy` contra la base de datos **antes** del push (el build
   de Vercel no migra).
3. Pedir confirmación al usuario antes de cada push a `main`.
4. Paso a live solo cuando el usuario lo haya probado entero en pruebas: claves live
   restringidas, endpoints de webhook live, checklist de salida a producción de Stripe.

## 8. Pendiente de confirmar con el usuario durante la ejecución

- Importe por defecto de la cuota de efectivo (propuesto: 2 €/mes por cliente).
- Monedas que se ofrecen en el selector (propuesto: EUR, DKK, SEK, NOK, GBP, USD).
- Si el cliente puede cambiar de periodicidad desde el portal o solo al renovar.
