# TrueRep — Design System (minimal)

Source of truth for tokens: `apps/mobile/src/constants/colors.ts` (mobile) and
`apps/backend/src/app/globals.css` (web dashboard). This file documents them
so design findings can be checked against something concrete instead of ad hoc
judgment — see CLAUDE.md's "Design Tokens" section for the same values.

## Color

| Token | Value | Use |
|---|---|---|
| `primary` | `#FF6B35` | Primary actions, active states, brand accent |
| `secondary` | `#004E89` | Secondary emphasis |
| `accent` | `#F7B801` | Highlights, badges |
| `success` | `#2ECC71` | Success states, completed items |
| `warning` | `#F39C12` | Warnings, INTERMEDIATE difficulty |
| `danger` | `#E74C3C` | Errors, destructive actions, ADVANCED difficulty |
| `background` | `#FFFFFF` | Screen background |
| `surface` | `#F8F8F8` | Cards, elevated surfaces |
| `textPrimary` | `#1A1A1A` | Primary text |
| `textSecondary` | `#666666` | Secondary text |
| `textMuted` | `#999999` | Placeholder / disabled text |
| `border` | `#DDDDDD` | Default borders |

Difficulty color mapping: `BEGINNER` → success green, `INTERMEDIATE` → warning
amber, `ADVANCED` → danger red. Keep this mapping consistent everywhere a
difficulty badge appears (dashboard, mobile routine cards, challenge lists).

## Typography

**Fuente del sistema, a propósito.** Ni la app móvil ni el dashboard cargan una
webfont. (CLAUDE.md decía "Inter" pero nunca se llegó a cargar en ningún sitio:
ambas apps llevaban desde el scaffold usando la fuente del sistema.) Se queda
así porque la fuente del sistema ya trae optical sizing, tablas de tracking y
ajustes de legibilidad por tamaño que una webfont habría que replicar a mano —
y cuesta una petición menos en cada carga. Añadir Inter requiere una razón de
marca concreta, no inercia.

**Escala:** `apps/mobile/src/constants/typography.ts` (mobile) y las variables
`--text-*--line-height` / `--text-*--letter-spacing` de `@theme` en
`globals.css` (web). Usa los tokens; no introduzcas tamaños ad hoc.

| Token (mobile) | Tamaño / leading | Tracking | Uso |
|---|---|---|---|
| `display` | 26 / 29 | −0.5 | Saludo, titular de pantalla |
| `title` | 22 / 26 | −0.4 | Título de pantalla o modal |
| `section` | 18 / 23 | −0.2 | Cabecera de sección |
| `cardTitle` | 16 / 21 | −0.1 | Título de tarjeta o item |
| `body` | 15 / 22 | 0 | Cuerpo de texto |
| `meta` | 13 / 18 | +0.1 | Subtítulo bajo un título |
| `label` | 12 / 16 | +0.2 | Etiqueta, badge, caption |
| `stat` | 22 / 24 | −0.6 | Cifra destacada (XP, racha) |

**Tracking y leading son específicos del tamaño, nunca un valor único.** El
texto grande se lee demasiado separado si mantiene el tracking del cuerpo, así
que va en negativo y se aprieta el leading; el texto pequeño gana legibilidad
con tracking ligeramente positivo y leading más holgado. Un `letterSpacing`
fijo para toda la app está mal en algún tamaño por definición.

## Spacing & Radius

4px spacing scale: `xs=4, sm=8, md=12, lg=16, xl=24, xxl=32`.
Corner radius: `sm=8, md=12, full=9999` (pills/avatars).

## Rules

- **Idioma: español.** Toda la copy visible para el usuario va en español, en
  las dos superficies. Las pantallas del scaffold original estaban en inglés y
  convivían con las nuevas en español (barra de pestañas mezclando "Home" y
  "Progreso", títulos de modal mezclando "Workout" y "Suscripción") — corregido
  el 2026-09-28. El dashboard web declara `lang="es"`.
- **Nunca mostrar valores de enum crudos.** `BEGINNER` es jerga interna;
  se traduce con `DIFFICULTY_LABEL` (`apps/mobile/src/constants/labels.ts`), no
  con `.toLowerCase()`. Mismo criterio que ya seguía el dashboard.
- **Respuesta al pulsar: obligatoria, y al APOYAR el dedo, no al soltar.**
  Cualquier cosa pulsable tiene que dar señal inmediata; sin ella la interfaz
  se siente muerta. Patrón: `PressableCard` para tarjetas, el estado `pressed`
  de `Pressable` para chips, y `button:active` en el dashboard (todos
  `scale(0.97–0.98)` + opacidad). No envuelvas una `Card` en una `Pressable`
  desnuda — eso es exactamente lo que no daba feedback.
- **Pulsado ≠ deshabilitado.** Tienen que verse distintos. `Button` usaba la
  misma opacidad `0.6` para los dos, así que un botón deshabilitado parecía
  estar pulsándose siempre; ahora `pressed` es scale+0.9 y `disabled` es 0.4.
- **Touch targets ≥ 44px** on mobile (non-negotiable rule #5 in CLAUDE.md).
  Existing pattern: `Button`, weight/hour inputs already enforce `minHeight: 44`.
  Ojo con los que no son botones obvios: los chips de filtro de `workouts.tsx`
  medían ~32px y los enlaces de login/signup eran solo la caja del texto
  (~20px) — corregidos con `minHeight: 44` y `paddingVertical`.
- **Works at 320px width** — no fixed-width layouts on mobile screens.
- **Web dashboard**: two-column layouts (e.g. `routine-builder.tsx`) must
  collapse to a single column below the `lg` breakpoint (Tailwind `lg:`)
  instead of assuming desktop-width viewports.
- **Iconography**: currently emoji (🏋💬🎬📝📅🔥👋⭐✓) used as functional icons
  across dashboard/mobile. Flagged as AI-slop risk in the 2026-07-31 Design
  Review — tracked as a follow-up in TODOS.md (needs an icon library choice,
  e.g. `@expo/vector-icons` for mobile + a matching set for the web
  dashboard, plus accessibility labels). Until that lands, don't introduce
  *more* emoji-as-icon patterns in new screens if a text label alone would do.
- **Empty/loading/error states are required**, not optional polish, for any
  new screen that fetches data — see the 2026-07-31 Design Review finding
  that loading and "genuinely zero data" must never look identical.
  (`workouts.tsx` y `challenges.tsx` renderizaban `null` mientras cargaban: una
  lista en blanco, sin ninguna señal de que algo estaba en camino. Corregido con
  un estado de carga explícito.)

## Sin gestos, de momento

No hay ninguna superficie arrastrable en la app: ni bottom sheets, ni
swipe-to-dismiss, ni carruseles. Por eso no hay muelles (springs), ni traspaso
de velocidad, ni proyección de momento, ni rubber-banding — y no se han
añadido: construir un gesto solo para justificar la física sería inventarse una
feature. `react-native-reanimated` no está instalado y no hace falta hasta que
exista un gesto de verdad.

Cuando llegue ese momento (p. ej. deslizar para descartar una tarea de hoy), lo
que hace falta es: animar desde el valor actual en pantalla y no desde el
objetivo, poder agarrar e invertir la animación a mitad de vuelo, heredar la
velocidad del dedo al soltar, y proyectar dónde acabaría el movimiento para
elegir el destino. Muelle por defecto sin rebote; rebote solo cuando el gesto
traía momento. Y ahí sí hay que respetar `prefers-reduced-motion` con un
fundido en vez del desplazamiento.
