# Diseño técnico: Sistema de Skills (diferenciación de TrueRep)

> Documento de diseño. **No hay código todavía** — es para revisar antes de construir.
> Fecha: 2026-07-16 · Gate: **Premium, sin límite duro** (igual que el análisis de vídeo actual).

## 1. Objetivo

Las cuatro direcciones de diferenciación elegidas —IA de técnica, árbol de skills,
coach híbrido y progreso medible/verificado— **no son cuatro features, son un solo
sistema** alrededor de un objeto nuevo: el **Skill**.

Esto reutiliza lo que ya existe (OpenAI Vision, Cloudinary keyframes, dashboard de
coach, gamificación, programador multi-tarea) y produce un foso difícil de copiar:
un logro de skill **verificado por IA** (técnica correcta + métrica medida), no un
check auto-reportado.

### Qué existe hoy (punto de partida)
- `lib/openai.ts` → `analyzeForm(exerciseName, frameUrls)` devuelve **texto libre** (3 tips).
- `api/video-feedback/analyze` → crea `VideoFeedback`, analiza en `after()`, gate `requirePremium`.
- `lib/cloudinary.ts` → `keyframeUrls(video_url)` extrae keyframes.
- Modelo `VideoFeedback { exercise_name, video_url, analysis_status, feedback_text }`.
- Enum `ProgramItemType { ROUTINE, MESSAGE, VIDEO, NOTE, SESSION }` (programador multi-tarea).
- Gamificación: `xp`, `streak`, `challenges`.

## 2. Modelo de datos (1 migración nueva)

```prisma
model Skill {
  id             String    @id @default(cuid())
  trainer_id     String?   // null = skill curado/global; si no, propiedad del trainer
  trainer        User?     @relation("TrainerSkills", fields: [trainer_id], references: [id], onDelete: SetNull)
  name           String    // "Handstand libre", "Straddle Planche"
  category       SkillCategory
  tier           Int       // orden de dificultad dentro de la categoría (1..n)
  description    String?   @db.Text
  demo_video_url String?   // vídeo de referencia del skill
  criteria       Json      // { metric, target, form_cues: string[] }  (ver §3)
  deleted_at     DateTime?
  created_at     DateTime  @default(now())
  updated_at     DateTime  @updatedAt

  prerequisites  SkillPrerequisite[] @relation("SkillPrereqOf")
  required_by    SkillPrerequisite[] @relation("SkillRequires")
  progress       SkillProgress[]

  @@index([trainer_id, category])
  @@map("skills")
}

model SkillPrerequisite {
  id                String @id @default(cuid())
  skill_id          String // este skill…
  requires_skill_id String // …requiere este otro
  skill             Skill  @relation("SkillPrereqOf", fields: [skill_id], references: [id], onDelete: Cascade)
  requires          Skill  @relation("SkillRequires", fields: [requires_skill_id], references: [id], onDelete: Cascade)

  @@unique([skill_id, requires_skill_id])
  @@map("skill_prerequisites")
}

model SkillProgress {
  id          String            @id @default(cuid())
  user_id     String
  user        User              @relation(fields: [user_id], references: [id], onDelete: Cascade)
  skill_id    String
  skill       Skill             @relation(fields: [skill_id], references: [id], onDelete: Cascade)
  status      SkillStatus       @default(LOCKED)
  best_metric Float?            // mejor valor medido (segundos de hold, reps limpias…)
  achieved_at DateTime?
  updated_at  DateTime          @updatedAt

  @@unique([user_id, skill_id])
  @@index([user_id, status])
  @@map("skill_progress")
}

enum SkillCategory { PUSH PULL CORE LEGS STATIC DYNAMIC }
enum SkillStatus   { LOCKED AVAILABLE IN_PROGRESS ACHIEVED }
```

Cambios sobre modelos existentes:
- `VideoFeedback` gana `skill_id String?` + relación opcional → enlaza el intento con el skill.
- `VideoFeedback` gana `measured_value Float?` y `passed Boolean?` → resultado estructurado de la IA.
- `ProgramItemType` gana el valor **`SKILL`** (nueva tarea asignable en el programador).
- `User` gana relación inversa `skills Skill[] @relation("TrainerSkills")` y `skill_progress SkillProgress[]`.

> **Nota de árbol:** los prerequisitos son un grafo dirigido. Un ciclo rompería el
> desbloqueo. La validación anti-ciclo se hace al crear aristas en el dashboard (§7).

## 3. IA skill-aware (el foso — dirección #1 y #4)

`analyzeForm` se rediseña para recibir el contexto del skill y devolver **JSON
estructurado y validado**, en vez de texto libre.

### Entrada
- `skill.name`, `skill.criteria.form_cues[]` (qué mirar), `skill.criteria.metric` y `target`.
- keyframes de Cloudinary (ya existe `keyframeUrls`).

### Salida (contrato JSON que la IA debe cumplir)
```json
{
  "measured_value": 12,          // p.ej. segundos de hold estimados, o reps limpias
  "form_ok": false,              // ¿cumple los form_cues clave?
  "issues": [                    // correcciones accionables
    "Las caderas están en pica; abre el ángulo hombro-cadera",
    "Codos flexionados: bloquéalos para transmitir fuerza"
  ],
  "positives": ["Buena alineación de muñecas"],
  "confidence": "high"           // high | medium | low
}
```

- Se pide con `response_format: { type: "json_object" }` y un **schema Zod
  (`skillAnalysisSchema`)** que valida la respuesta antes de tocar la DB (regla #8).
- Si la IA devuelve algo inválido o `confidence: "low"`, el intento queda como
  `COMPLETED` pero **no** marca ACHIEVED (fail-safe: no auto-verificar con baja confianza).

### Prompt (borrador)
```
Eres un juez experto de calistenia evaluando la ejecución de "{skill.name}".
Criterios de técnica correcta: {form_cues}.
Métrica a medir: {metric} (objetivo para superar: {target}).
Analiza los fotogramas y responde SOLO con JSON: { measured_value, form_ok,
issues[], positives[], confidence }. Sé concreto y accionable. No inventes: si no
puedes medir con seguridad, usa confidence "low".
```

> **Ceiling (ponytail):** la métrica se **estima** de keyframes, no se mide con
> sensores; `confidence` acota el riesgo. Si más adelante se quiere precisión de
> hold-time real, se sube a análisis de vídeo completo (frames densos) o cronómetro
> in-app. El diseño no cambia, solo el proveedor de `measured_value`.

## 4. Flujo de verificación (dirección #4)

```
Cliente sube vídeo del intento de un skill
  → POST /api/skills/{id}/attempt  (requirePremium)
  → crea VideoFeedback(skill_id, PENDING)
  → after(): keyframes → analyzeForm(skill-aware) → parse/valida JSON
  → guarda measured_value, passed=(form_ok && measured_value >= target), issues
  → si passed: SkillProgress.status=ACHIEVED, best_metric=max(best, measured_value),
              achieved_at=now  + XP de gamificación + recomputar desbloqueos (§7)
  → si !passed: SkillProgress.status=IN_PROGRESS, best_metric=max(best, measured_value)
```

El **mismo mecanismo** sirve para verificar retos: un `Challenge` puede exigir un
skill; completar el reto = tener ese skill ACHIEVED (verificado). Sin auto-reporte.

## 5. Endpoints API (patrón `handler` + Zod + gates existentes)

| Ruta | Método | Gate | Notas |
|------|--------|------|-------|
| `/api/skills` | GET | requireUser | catálogo (curados + del trainer del programa); con estado del usuario |
| `/api/skills` | POST | requireTrainer | crear skill (coach) |
| `/api/skills/[id]` | GET, PATCH, DELETE | GET requireUser / mutaciones requireTrainer (ownership) | criterios, prereqs |
| `/api/skills/[id]/prerequisites` | PUT | requireTrainer | set de prereqs (valida no-ciclo) |
| `/api/skills/[id]/attempt` | POST | **requirePremium** | sube vídeo → análisis + verificación (§4) |
| `/api/me/skills` | GET | requireUser | árbol del usuario con `status` y `best_metric` (§7) |
| `/api/skills/attempts/[feedbackId]` | GET | requirePremium (dueño) | resultado del intento (issues, measured_value) |
| `/api/clients/[id]/skills` | GET | requireTrainer | cola de revisión: intentos del cliente + veredicto IA (§8) |
| `/api/skills/attempts/[feedbackId]/review` | PATCH | requireTrainer | override del coach: confirmar/rechazar ACHIEVED (§8) |

Validators nuevos en `packages/shared`: `createSkillSchema`, `skillCriteriaSchema`,
`skillPrerequisitesSchema`, `skillAttemptSchema`, `skillAnalysisSchema` (respuesta IA),
`reviewAttemptSchema`. Tipos en `types/domain.ts`: `Skill`, `SkillProgress`,
`SkillNode` (árbol), `SkillAttemptResult`.

## 6. Árbol de skills — lógica de desbloqueo (dirección #2)

Estado derivado, recomputado tras cada logro:
```
para cada skill del usuario:
  si ACHIEVED         → ACHIEVED
  si algún intento    → IN_PROGRESS
  si todos los prereqs ACHIEVED → AVAILABLE
  si no               → LOCKED
```
- `GET /api/me/skills` devuelve nodos `{ skill, status, best_metric }` + aristas
  (prereqs) para pintar el grafo.
- **Móvil:** pantalla "Skills" con el árbol por categoría (nodos LOCKED en gris,
  AVAILABLE resaltados, ACHIEVED con check). Tap en un nodo AVAILABLE → grabar intento.
- **Ponytail:** el layout del grafo se calcula en cliente con las aristas; sin
  librería de grafos pesada, columnas por `tier` y líneas simples primero.

## 7. Loop de coach (dirección #3)

- **Autoría:** el trainer crea skills, define `criteria` (metric, target, form_cues)
  y prerequisitos desde el dashboard (`/skills` nuevo en el sidebar del backoffice).
- **Asignación:** nuevo tipo de tarea **`SKILL`** en el programador multi-tarea que
  ya construimos → `data: { skill_id }`. Aparece como tarea del día en "Hoy" (móvil)
  con acceso directo a grabar el intento.
- **Revisión:** `GET /api/clients/[id]/skills` = cola con los intentos del cliente y
  el veredicto de la IA. El coach puede **override** (`review`): confirmar un ACHIEVED
  que la IA dejó en `low confidence`, o revocar uno. Humano tiene la última palabra
  → posicionamiento "coach de verdad, no una app de vídeos".

## 8. Móvil — pantallas afectadas

| Pantalla | Cambio |
|----------|--------|
| Nueva tab/pantalla **Skills** | árbol por categoría, estado por nodo, CTA grabar intento |
| Detalle de skill | criterios, vídeo demo, mejor marca, historial de intentos con feedback IA |
| Grabar intento | reutiliza `feedback-camera` existente; sube a Cloudinary → `/attempt` |
| "Hoy" (home) | la tarea `SKILL` del programa enlaza al detalle del skill |
| Progreso | añadir "skills conseguidos" a las stats |

## 9. Gate y coste (decisión tomada: Premium, sin límite duro)

- `/skills/[id]/attempt` usa **`requirePremium`**, igual que el análisis de vídeo actual.
- **Sin cuota** por ahora. Cada intento = 1 llamada GPT-4o Vision (~céntimos).
- **Riesgo a vigilar:** un usuario Premium podría lanzar muchos intentos/día. Mitigadores
  baratos si hace falta luego (no ahora): dedupe de vídeos idénticos, y ya existe el
  `after()` que serializa el trabajo. Añadir cuota diaria es un cambio localizado si el
  coste sorprende.

## 10. Fases de implementación

- **Fase A — Foso (IA + verificación):** migración `Skill`/`SkillProgress`, `analyzeForm`
  skill-aware + `skillAnalysisSchema`, `/skills` CRUD mínimo, `/skills/[id]/attempt`,
  actualización de `SkillProgress` + XP. Entrega #1 y #4. *Es el 70% del diferencial.*
- **Fase B — Árbol:** `SkillPrerequisite`, desbloqueo, `/me/skills`, pantalla de árbol móvil. #2.
- **Fase C — Coach loop:** tipo de tarea `SKILL`, cola de revisión, override. #3.

Cada fase compila y pasa `pnpm type-check` + tests de validators (regla #10).

## 11. Tests (mínimos por fase)
- `skillCriteriaSchema` / `skillAnalysisSchema`: aceptan JSON válido, rechazan métrica/target inválidos.
- Verificación: `passed` = `form_ok && measured_value >= target`; `low confidence` nunca marca ACHIEVED.
- Desbloqueo: skill con prereqs no cumplidos → LOCKED; cumplidos → AVAILABLE.
- Anti-ciclo en prerequisitos.

## 12. Decisiones abiertas (para ti)
1. **Catálogo inicial:** ¿arrancamos con un set curado de skills (handstand, planche,
   levers, muscle-up…) creado por seed, o solo los que cree cada coach?
2. **Métrica por defecto:** ¿`hold_seconds` para estáticos y `clean_reps` para dinámicos,
   o dejamos que el coach elija libremente por skill? (el diseño soporta ambos).
3. **XP por skill:** ¿cuánto XP da un ACHIEVED? ¿escala por `tier`?
4. **Reto verificado:** ¿lo incluimos ya en Fase A o lo dejamos para después de C?
```
