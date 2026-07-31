# Graph Report - true-rep  (2026-07-16)

## Corpus Check
- 134 files · ~45,940 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 765 nodes · 1255 edges · 90 communities (44 shown, 46 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a6af6e31`
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
- react-native
- react-native-safe-area-context
- @supabase/supabase-js
- @tanstack/react-query
- expo-device
- expo-notifications
- react-native-screens
- @truerep/shared

## God Nodes (most connected - your core abstractions)
1. `ok()` - 37 edges
2. `handler()` - 36 edges
3. `api()` - 27 edges
4. `fail()` - 26 edges
5. `colors` - 19 edges
6. `spacing` - 18 edges
7. `parseBody()` - 17 edges
8. `requireUser()` - 16 edges
9. `compilerOptions` - 16 edges
10. `TrueRep — Blueprint` - 16 edges

## Surprising Connections (you probably didn't know these)
- `CI Pipeline` --references--> `type-check`  [EXTRACTED]
  .github/workflows/ci.yml → apps/backend/package.json
- `CI Pipeline` --references--> `test`  [EXTRACTED]
  .github/workflows/ci.yml → apps/backend/package.json
- `RoutineDraft` --references--> `Difficulty`  [EXTRACTED]
  apps/backend/src/app/(dashboard)/routines/routine-builder.tsx → packages/shared/src/types/domain.ts
- `Props` --references--> `Routine`  [EXTRACTED]
  apps/mobile/src/components/workout/RoutineCard.tsx → packages/shared/src/types/domain.ts
- `CI Pipeline` --rationale_for--> `TypeScript Strict, No Escape Hatches`  [INFERRED]
  .github/workflows/ci.yml → true-rep.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Workout Completion Flow** — apps_backend_src_app_api_workouts_log_route_post, apps_backend_src_lib_gamification_calcxp, apps_backend_src_lib_gamification_nextstreak, apps_backend_src_lib_gamification_checkachievements, true_rep_realtime_leaderboard [EXTRACTED 1.00]
- **AI Video Feedback Flow** — apps_backend_src_app_api_video_feedback_upload_url_route_post, apps_backend_src_lib_cloudinary_signeduploadparams, apps_backend_src_lib_cloudinary_keyframeurls, apps_backend_src_app_api_video_feedback_analyze_route_post, apps_backend_src_lib_openai_analyzeform, apps_backend_src_app_api_video_feedback_id_status_route_get [EXTRACTED 1.00]
- **Auth and Role Gating** — apps_backend_src_middleware_isdashboardroute, apps_backend_src_lib_auth_requireuser, apps_backend_src_lib_auth_requiretrainer, apps_backend_src_lib_auth_optionaluser, apps_backend_src_app_api_webhooks_clerk_route_post [EXTRACTED 1.00]

## Communities (90 total, 46 thin omitted)

### Community 0 - "Mobile Screens and Navigation"
Cohesion: 0.06
Nodes (63): styles, styles, ChallengeDetailScreen(), styles, styles, UploadParams, euro(), PaywallScreen() (+55 more)

### Community 1 - "Backend API Routes"
Cohesion: 0.05
Nodes (70): POST, GET, GET, GET, POST, GET, Params, GET (+62 more)

### Community 2 - "Backend Build Scripts"
Cohesion: 0.06
Nodes (34): devDependencies, prisma, tailwindcss, @tailwindcss/postcss, tsx, @types/node, @types/react, typescript (+26 more)

### Community 4 - "Mobile Dependencies"
Cohesion: 0.15
Nodes (13): dependencies, expo, expo-secure-store, react, react-native, react-native-safe-area-context, zustand, react (+5 more)

### Community 5 - "Backend TypeScript Config"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 6 - "Expo App Config"
Cohesion: 0.07
Nodes (27): package, permissions, projectId, typedRoutes, expo, android, experiments, extra (+19 more)

### Community 7 - "Backend Dependencies"
Cohesion: 0.06
Nodes (31): dependencies, @clerk/nextjs, cloudinary, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, next, openai (+23 more)

### Community 9 - "Shared Domain Types"
Cohesion: 0.05
Nodes (40): DAY_NAMES, Tracking, ClientRow, ClientsPage(), empty, Item, PremiumUser, ProgramEditorPage() (+32 more)

### Community 10 - "Mobile Package Scripts"
Cohesion: 0.20
Nodes (9): devDependencies, @types/react, typescript, @types/react, typescript, main, name, private (+1 more)

### Community 11 - "Mobile TypeScript Config"
Cohesion: 0.15
Nodes (12): compilerOptions, paths, strict, extends, include, ./src/*, **/*.ts, **/*.tsx (+4 more)

### Community 12 - "Shared Package Manifest"
Cohesion: 0.15
Nodes (12): dependencies, zod, devDependencies, typescript, typescript, zod, main, name (+4 more)

### Community 13 - "Shared TypeScript Config"
Cohesion: 0.20
Nodes (9): compilerOptions, module, moduleResolution, noEmit, skipLibCheck, strict, target, include (+1 more)

### Community 14 - "Root Workspace Scripts"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, test, type-check

### Community 15 - "Mobile Root Layout and Auth Bridge"
Cohesion: 0.50
Nodes (3): AuthTokenBridge(), queryClient, registerTokenGetter()

### Community 20 - "Routine Creation Page"
Cohesion: 0.11
Nodes (22): calcXp(), checkAchievements(), nextStreak(), validRoutine, analyzeVideoSchema, assignProgramSchema, checkoutSchema, createChallengeSchema (+14 more)

### Community 24 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 25 - "code-reviewer.md"
Cohesion: 0.09
Nodes (22): Automated Pre-Checks, Code Quality Assessment, Constructive Feedback Principles, Dependencies, Design Patterns, Diff-First Reading Strategy, Documentation Review, Error Handling (+14 more)

### Community 26 - "true-rep.md"
Cohesion: 0.10
Nodes (20): 16. Reglas No Negociables, 17. Post-Launch Roadmap (Future Phases), 18. FAQ & Troubleshooting, Already auto-deployed on git push if connected, E2E tests (mobile), Edit .env.local with your keys (Clerk, Stripe, Supabase, OpenAI, Cloudinary), In another terminal, setup mobile, In Expo Go: shake phone → View logs (+12 more)

### Community 27 - "TrueRep"
Cohesion: 0.17
Nodes (11): Architecture, Commands, Data Flow, Debugging, Design Tokens, Environment Variables, graphify, Quick Start (+3 more)

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
Cohesion: 0.33
Nodes (6): scripts, android, dev, ios, start, type-check

### Community 77 - "expo-constants"
Cohesion: 0.48
Nodes (5): GET, isSameLocalDay(), localHour(), PushMessage, sendPushNotifications()

## Knowledge Gaps
- **394 isolated node(s):** `validRoutine`, `nextConfig`, `name`, `version`, `private` (+389 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **46 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo-router` connect `Mobile Screens and Navigation` to `Expo App Config`, `Mobile Root Layout and Auth Bridge`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `plugins` connect `Expo App Config` to `Mobile Screens and Navigation`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `validRoutine`, `nextConfig`, `name` to the rest of the system?**
  _394 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Mobile Screens and Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.058383838383838385 - nodes in this community are weakly interconnected._
- **Should `Backend API Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.05354691075514874 - nodes in this community are weakly interconnected._
- **Should `Backend Build Scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `Backend TypeScript Config` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._