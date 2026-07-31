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

Inter font family (per CLAUDE.md). No separate type scale file yet — follow
the sizes already used in `apps/mobile/src/app/**` (headings 20-28px bold,
body 14-16px, meta/labels 12-13px) rather than introducing new ad hoc sizes.

## Spacing & Radius

4px spacing scale: `xs=4, sm=8, md=12, lg=16, xl=24, xxl=32`.
Corner radius: `sm=8, md=12, full=9999` (pills/avatars).

## Rules

- **Touch targets ≥ 44px** on mobile (non-negotiable rule #5 in CLAUDE.md).
  Existing pattern: `Button`, weight/hour inputs already enforce `minHeight: 44`.
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
