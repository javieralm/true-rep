# Graph Report - true-rep  (2026-09-29)

## Corpus Check
- 181 files · ~76,426 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1040 nodes · 1795 edges · 132 communities (70 shown, 62 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e7a71223`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Mobile Screens and Navigation
- Backend API Routes
- Backend Build Scripts
- Auth, Payments and AI Integrations
- Mobile Dependencies
- Backend TypeScript Config
- Expo App Config
- Backend Dependencies
- Gamification and Validators
- Shared Domain Types
- Mobile Package Scripts
- Mobile TypeScript Config
- Shared Package Manifest
- Shared TypeScript Config
- Root Workspace Scripts
- Mobile Root Layout and Auth Bridge
- Backend Root Layout
- Next.js Config
- Next Env Types
- Trainer Dashboard Layout
- Routine Creation Page
- What You Must Do When Invoked
- code-reviewer.md
- true-rep.md
- TrueRep
- 11. Dependencies
- graphify reference: extra exports and benchmark
- TrueRep — Blueprint
- graphify reference: query, path, explain
- 9. Build Order
- TrueRep
- 12. Deployment Strategy
- 7. Design System
- 8. Authentication & Authorization
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- 10. Environment Setup
- 13. Testing Strategy
- 1. Project Overview
- 4. Data Model
- 6. Frontend Architecture (React Native)
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- CLAUDE.md
- extraction-spec.md
- Workspace Package Globs
- Quick Start Setup
- Achievement Unlock Conditions
- AI Posture Feedback
- API Response Envelope
- Clerk Auth Flow
- Cloudinary Video Pipeline
- Design Tokens
- External Call Isolation
- Gamification System
- Keyframe Extraction
- Mobile Touch Constraints
- Prisma Migrations Only
- Real-time Leaderboard
- Shared Domain Types
- Social Challenges (Retos)
- Streak Tracking
- Subscription Monetization
- Supabase Realtime Channels
- Two-Sided Roles (User / Trainer)
- Webhook Signature Verification
- XP Award Formula
- Zod Validation Boundary
- scripts
- @clerk/clerk-expo
- expo
- expo-constants
- expo-image-picker
- expo-linking
- expo-secure-store
- expo-status-bar
- react-native-safe-area-context
- @supabase/supabase-js
- @tanstack/react-query
- expo-device
- expo-notifications
- react-native-screens
- @truerep/shared
- Diseño técnico: Sistema de Skills (diferenciación de TrueRep)
- domain.ts
- routine-builder.tsx
- route.ts
- db.ts
- handler
- route.ts
- page.tsx
- route.ts
- Routine
- page.tsx
- page.tsx
- @clerk/clerk-expo
- expo-router
- scripts
- TODOS
- paywall.tsx
- TrueRep — Design System (minimal)
- package.json
- route.ts
- route.ts
- route.ts
- page.tsx
- eslint.config.js
- @dnd-kit/sortable
- openai
- react
- react-dom
- @supabase/supabase-js
- expo-auth-session
- expo-crypto
- expo-font
- expo-image-picker
- @expo/metro-runtime
- @expo/vector-icons
- expo-web-browser
- react
- react-dom
- react-native
- react-native-safe-area-context
- zustand

## God Nodes (most connected - your core abstractions)
1. `ok()` - 41 edges
2. `handler()` - 41 edges
3. `fail()` - 32 edges
4. `api()` - 29 edges
5. `requireTrainer()` - 21 edges
6. `colors` - 21 edges
7. `parseBody()` - 19 edges
8. `requireUser()` - 19 edges
9. `spacing` - 19 edges
10. `expo-router` - 17 edges

## Surprising Connections (you probably didn't know these)
- `CI Pipeline` --references--> `type-check`  [EXTRACTED]
  .github/workflows/ci.yml → apps/backend/package.json
- `CI Pipeline` --references--> `test`  [EXTRACTED]
  .github/workflows/ci.yml → apps/backend/package.json
- `ExercisesPage()` --indirect_call--> `load()`  [INFERRED]
  apps/backend/src/app/(dashboard)/exercises/page.tsx → apps/mobile/src/lib/exerciseHistory.ts
- `RoutineDraft` --references--> `Difficulty`  [EXTRACTED]
  apps/backend/src/app/(dashboard)/routines/routine-builder.tsx → packages/shared/src/types/domain.ts
- `RoutineDraft` --references--> `Exercise`  [EXTRACTED]
  apps/backend/src/app/(dashboard)/routines/routine-builder.tsx → packages/shared/src/types/domain.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Workout Completion Flow** — apps_backend_src_app_api_workouts_log_route_post, apps_backend_src_lib_gamification_calcxp, apps_backend_src_lib_gamification_nextstreak, apps_backend_src_lib_gamification_checkachievements, true_rep_realtime_leaderboard [EXTRACTED 1.00]
- **AI Video Feedback Flow** — apps_backend_src_app_api_video_feedback_upload_url_route_post, apps_backend_src_lib_cloudinary_signeduploadparams, apps_backend_src_lib_cloudinary_keyframeurls, apps_backend_src_app_api_video_feedback_analyze_route_post, apps_backend_src_lib_openai_analyzeform, apps_backend_src_app_api_video_feedback_id_status_route_get [EXTRACTED 1.00]
- **Auth and Role Gating** — apps_backend_src_middleware_isdashboardroute, apps_backend_src_lib_auth_requireuser, apps_backend_src_lib_auth_requiretrainer, apps_backend_src_lib_auth_optionaluser, apps_backend_src_app_api_webhooks_clerk_route_post [EXTRACTED 1.00]

## Communities (132 total, 62 thin omitted)

### Community 0 - "Mobile Screens and Navigation"
Cohesion: 0.13
Nodes (23): styles, Status, styles, UploadParams, styles, styles, LeaderboardRow(), styles (+15 more)

### Community 1 - "Backend API Routes"
Cohesion: 0.12
Nodes (17): DELETE, Params, PATCH, GET, POST, PATCH, POST, Params (+9 more)

### Community 2 - "Backend Build Scripts"
Cohesion: 0.12
Nodes (17): devDependencies, prisma, tailwindcss, @tailwindcss/postcss, tsx, @types/node, @types/react, typescript (+9 more)

### Community 3 - "Auth, Payments and AI Integrations"
Cohesion: 0.50
Nodes (3): config, isAdminRoute, isDashboardRoute

### Community 5 - "Backend TypeScript Config"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 6 - "Expo App Config"
Cohesion: 0.06
Nodes (31): backgroundColor, foregroundImage, adaptiveIcon, package, permissions, projectId, typedRoutes, expo (+23 more)

### Community 7 - "Backend Dependencies"
Cohesion: 0.10
Nodes (21): dependencies, @clerk/nextjs, cloudinary, @dnd-kit/core, @dnd-kit/utilities, next, @prisma/client, stripe (+13 more)

### Community 9 - "Shared Domain Types"
Cohesion: 0.19
Nodes (8): AdminUser, ClientRow, ClientsPage(), ProgramEditorPage(), ProgramRow, ProgramsPage(), apiFetch(), Program

### Community 10 - "Mobile Package Scripts"
Cohesion: 0.07
Nodes (29): devDependencies, eslint, eslint-config-expo, jest, jest-expo, @testing-library/react-native, @types/jest, @types/react (+21 more)

### Community 11 - "Mobile TypeScript Config"
Cohesion: 0.13
Nodes (14): compilerOptions, paths, strict, types, extends, include, ./src/*, **/*.ts (+6 more)

### Community 12 - "Shared Package Manifest"
Cohesion: 0.15
Nodes (12): dependencies, zod, devDependencies, typescript, typescript, zod, main, name (+4 more)

### Community 13 - "Shared TypeScript Config"
Cohesion: 0.20
Nodes (9): compilerOptions, module, moduleResolution, noEmit, skipLibCheck, strict, target, include (+1 more)

### Community 14 - "Root Workspace Scripts"
Cohesion: 0.13
Nodes (14): devDependencies, @types/react, engines, node, @types/react, name, packageManager, private (+6 more)

### Community 15 - "Mobile Root Layout and Auth Bridge"
Cohesion: 0.15
Nodes (7): AuthTokenBridge(), queryClient, RootNavigator(), useRefetchOnForeground(), ApiError, registerTokenGetter(), mockFetch

### Community 19 - "Trainer Dashboard Layout"
Cohesion: 0.18
Nodes (15): POST, GET, GET, GET, GET, POST, DashboardLayout(), fail() (+7 more)

### Community 20 - "Routine Creation Page"
Cohesion: 0.08
Nodes (32): POST, RoutineForValidation, validateAgainstRoutine(), calcXp(), checkAchievements(), nextStreak(), validRoutine, NOW (+24 more)

### Community 24 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 25 - "code-reviewer.md"
Cohesion: 0.09
Nodes (22): Automated Pre-Checks, Code Quality Assessment, Constructive Feedback Principles, Dependencies, Design Patterns, Diff-First Reading Strategy, Documentation Review, Error Handling (+14 more)

### Community 26 - "true-rep.md"
Cohesion: 0.09
Nodes (21): 16. Reglas No Negociables, 17. Post-Launch Roadmap (Future Phases), 18. FAQ & Troubleshooting, Already auto-deployed on git push if connected, E2E tests (mobile), Edit .env.local with your keys (Clerk, Stripe, Supabase, OpenAI, Cloudinary), Estado de features evaluadas del resumen de coaching SaaS (2026-09-28), In another terminal, setup mobile (+13 more)

### Community 27 - "TrueRep"
Cohesion: 0.15
Nodes (12): Architecture, Commands, Data Flow, Debugging, Design Tokens, Environment Variables, graphify, Quick Start (+4 more)

### Community 28 - "11. Dependencies"
Cohesion: 0.20
Nodes (10): 11. Dependencies, Backend (apps/backend), Core, Core, Dev, Dev, Media & UI, Mobile (apps/mobile) (+2 more)

### Community 29 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 30 - "TrueRep — Blueprint"
Cohesion: 0.25
Nodes (8): 14. Skills to Use During Build, 15. CLAUDE.md for Target Project, 2. Tech Stack, 3. Directory Structure, 5. API Design, Key Endpoints Detail, Routes Overview, TrueRep — Blueprint

### Community 31 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 32 - "9. Build Order"
Cohesion: 0.33
Nodes (6): 9. Build Order, **Week 1: Foundation & Backend Setup**, **Week 2: Mobile App Foundation & Routine Management**, **Week 3: Workout Tracking & Gamification**, **Week 4: Social Features (Challenges & Community)**, **Week 5: Video Feedback & Polish**

### Community 33 - "TrueRep"
Cohesion: 0.40
Nodes (4): Documentación, Puesta en marcha, Tests y verificación, TrueRep

### Community 34 - "12. Deployment Strategy"
Cohesion: 0.40
Nodes (5): 12. Deployment Strategy, CI/CD, Domain & DNS, Environments, Hosting

### Community 35 - "7. Design System"
Cohesion: 0.40
Nodes (5): 7. Design System, Colors, Component Style, Spacing & Layout, Typography

### Community 36 - "8. Authentication & Authorization"
Cohesion: 0.40
Nodes (5): 8. Authentication & Authorization, Auth Flow, Protected Routes, Roles & Permissions, Session Management

### Community 37 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 38 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 39 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 40 - "10. Environment Setup"
Cohesion: 0.50
Nodes (4): 10. Environment Setup, Environment Variables, Initial Setup Commands, Prerequisites

### Community 41 - "13. Testing Strategy"
Cohesion: 0.50
Nodes (4): 13. Testing Strategy, E2E Tests, Integration Tests, Unit Tests

### Community 42 - "1. Project Overview"
Cohesion: 0.50
Nodes (4): 1. Project Overview, Goals, Success Metrics, Vision

### Community 43 - "4. Data Model"
Cohesion: 0.50
Nodes (4): 4. Data Model, Database Schema (Prisma), Entities, Relationships

### Community 44 - "6. Frontend Architecture (React Native)"
Cohesion: 0.50
Nodes (4): 6. Frontend Architecture (React Native), Component Hierarchy (Key Pages), Pages / Routes, State Management

### Community 74 - "scripts"
Cohesion: 0.05
Nodes (38): 10 · B3 — `api()` robusto ✅, 11 · B5 — `useSchedule` ✅, 12 · B4 — estados de error ✅, 13 · B2 — Stripe ✅, 14 · B6 — teclado ✅, 15 · B14 — pull-to-refresh ✅, 6a · Jest y los tests del store ✅, 6b · Test del payload ⏭️ diferido (+30 more)

### Community 75 - "@clerk/clerk-expo"
Cohesion: 0.29
Nodes (7): dependencies, @babel/runtime, expo-camera, expo-secure-store, @babel/runtime, expo-camera, expo-secure-store

### Community 77 - "expo-constants"
Cohesion: 0.31
Nodes (7): GET, Params, POST, isSameLocalDay(), localHour(), PushMessage, sendPushNotifications()

### Community 78 - "expo-image-picker"
Cohesion: 0.17
Nodes (7): GET, GET, GET(), GET, GET, GET, ok()

### Community 83 - "react-native-safe-area-context"
Cohesion: 0.14
Nodes (21): ChallengeDetailScreen(), ChallengesScreen(), ProfileScreen(), styles, ProgressScreen(), styles, Card(), useAchievements() (+13 more)

### Community 90 - "Diseño técnico: Sistema de Skills (diferenciación de TrueRep)"
Cohesion: 0.11
Nodes (17): 10. Fases de implementación, 11. Tests (mínimos por fase), 12. Decisiones abiertas (para ti), 1. Objetivo, 2. Modelo de datos (1 migración nueva), 3. IA skill-aware (el foso — dirección #1 y #4), 4. Flujo de verificación (dirección #4), 5. Endpoints API (patrón `handler` + Zod + gates existentes) (+9 more)

### Community 91 - "domain.ts"
Cohesion: 0.14
Nodes (14): Achievement, AnalysisStatus, ApiResponse, Challenge, DaySchedule, MeStats, PendingReviewFeedback, ProgramAssignment (+6 more)

### Community 92 - "routine-builder.tsx"
Cohesion: 0.27
Nodes (4): EditRoutinePage(), emptyDraft, RoutineBuilder(), RoutineDraft

### Community 93 - "route.ts"
Cohesion: 0.14
Nodes (18): POST, POST, POST, ClerkUserEvent, POST, POST, keyframeUrls(), signedUploadParams() (+10 more)

### Community 94 - "db.ts"
Cohesion: 0.14
Nodes (11): DELETE, GET, Params, PATCH, GET, POST, GET, Params (+3 more)

### Community 95 - "handler"
Cohesion: 0.29
Nodes (7): GET, Params, GET, GET, handler(), programPosition(), weekRange()

### Community 96 - "route.ts"
Cohesion: 0.15
Nodes (14): Dashboard(), styles, TASK_ICON, TASK_LABEL, filters, styles, WorkoutsScreen(), RoutineCard() (+6 more)

### Community 97 - "page.tsx"
Cohesion: 0.22
Nodes (8): Item, PremiumUser, ProgramFull, RoutineLite, TASK_META, ProgramItem, ProgramItemType, ProgramTaskData

### Community 98 - "route.ts"
Cohesion: 0.33
Nodes (4): GET, POST, GET, paginationSchema

### Community 99 - "Routine"
Cohesion: 0.06
Nodes (53): csvEscape(), toCsvRow(), computeWeightSuggestions(), WorkoutLog, elapsedMinutes(), styles, WorkoutSessionScreen(), ExerciseLogCard() (+45 more)

### Community 100 - "page.tsx"
Cohesion: 0.50
Nodes (3): empty, ExercisesPage(), LibraryExercise

### Community 101 - "page.tsx"
Cohesion: 0.67
Nodes (3): euro(), PricingPage(), PLAN_FEATURES

### Community 103 - "expo-router"
Cohesion: 0.13
Nodes (6): AuthLayout(), icon(), TabsLayout(), registerForPushNotifications(), mockUseAuth, expo-router

### Community 104 - "scripts"
Cohesion: 0.17
Nodes (13): scripts, build, db:deploy, db:migrate, db:seed, db:studio, dev, lint (+5 more)

### Community 105 - "TODOS"
Cohesion: 0.18
Nodes (10): Admin trainer-approval flow, Base de datos conectada (2026-09-28), Completed, Known local environment quirk (not a bug), Minas conocidas antes de desplegar (leer antes de tocar producción), Multi-trainer marketplace mechanics, Push notifications + cron reminders, Real-time leaderboards / social challenges (+2 more)

### Community 106 - "paywall.tsx"
Cohesion: 0.43
Nodes (5): euro(), PaywallScreen(), styles, useSubscription(), expo-web-browser

### Community 107 - "TrueRep — Design System (minimal)"
Cohesion: 0.29
Nodes (6): Color, Rules, Sin gestos, de momento, Spacing & Radius, TrueRep — Design System (minimal), Typography

### Community 108 - "package.json"
Cohesion: 0.33
Nodes (5): name, prisma, seed, private, version

### Community 109 - "route.ts"
Cohesion: 0.33
Nodes (5): DELETE, GET, Params, PATCH, updateRoutineSchema

### Community 110 - "route.ts"
Cohesion: 0.50
Nodes (3): Params, PATCH, setRoleSchema

### Community 111 - "route.ts"
Cohesion: 0.50
Nodes (3): CSV_HEADER, GET, Params

## Knowledge Gaps
- **515 isolated node(s):** `baseUser`, `validRoutine`, `afterCallbacks`, `feedback`, `params` (+510 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **62 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo-router` connect `expo-router` to `Mobile Screens and Navigation`, `route.ts`, `Routine`, `Expo App Config`, `Mobile Root Layout and Auth Bridge`, `react-native-safe-area-context`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `plugins` connect `Expo App Config` to `paywall.tsx`, `expo-router`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `baseUser`, `validRoutine`, `afterCallbacks` to the rest of the system?**
  _515 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Mobile Screens and Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.12682926829268293 - nodes in this community are weakly interconnected._
- **Should `Backend API Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.1225071225071225 - nodes in this community are weakly interconnected._
- **Should `Backend Build Scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `Backend TypeScript Config` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._