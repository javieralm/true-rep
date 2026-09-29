"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { apiFetch } from "@/lib/client-api";
import type { LibraryExercise, Exercise, Difficulty } from "@truerep/shared";

export interface RoutineDraft {
  title: string;
  description: string;
  difficulty: Difficulty;
  duration_minutes: number;
  is_published: boolean;
  exercises: Exercise[];
}

export const emptyDraft: RoutineDraft = {
  title: "",
  description: "",
  difficulty: "BEGINNER",
  duration_minutes: 30,
  is_published: false,
  exercises: [],
};

let nextId = 1;
function toRoutineExercise(lib: LibraryExercise): Exercise {
  return {
    id: `ex-${Date.now()}-${nextId++}`,
    exercise_id: lib.id,
    name: lib.name,
    sets: 3,
    // Hereda de la librería si admite segundos; el cliente elige al registrar
    // (por defecto repeticiones).
    ...(lib.measure === "seconds" ? { measure: "seconds" as const } : {}),
    reps: "10",
    rest_seconds: 60,
    ...(lib.video_url ? { technique_video_url: lib.video_url } : {}),
  };
}

// ─── Tarjeta de la librería (arrastrable) ───
function LibraryCard({ lib, onAdd }: { lib: LibraryExercise; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `lib-${lib.id}`,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }}
      className="flex cursor-grab items-center justify-between rounded-lg border border-[#ddd] bg-white p-3"
    >
      <div>
        <p className="text-sm font-medium">{lib.name}</p>
        <div className="mt-1 flex gap-1 text-[10px] uppercase text-[#666]">
          {lib.muscle_group && <span className="rounded bg-[#eee] px-1.5 py-0.5">{lib.muscle_group}</span>}
          {lib.equipment && <span className="rounded bg-[#eee] px-1.5 py-0.5">{lib.equipment}</span>}
        </div>
      </div>
      <button
        type="button"
        onClick={onAdd}
        title="Añadir a la rutina"
        className="rounded-full border border-[#ddd] px-2 text-lg leading-none"
      >
        +
      </button>
    </div>
  );
}

// ─── Fila de ejercicio en la rutina (ordenable) ───
function ExerciseRow({
  ex,
  onChange,
  onRemove,
}: {
  ex: Exercise;
  onChange: (updated: Exercise) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: ex.id });
  const num = (v: string) => (v === "" ? undefined : Number(v));
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="rounded-lg border border-[#ddd] bg-white p-3"
    >
      <div className="flex items-center gap-2">
        <span {...attributes} {...listeners} className="cursor-grab text-[#999]" title="Arrastrar">
          ⠿
        </span>
        <span className="flex-1 text-sm font-medium">{ex.name}</span>
        <label className="flex items-center gap-1 text-xs text-[#666]">
          Series
          <input
            type="number"
            min={1}
            max={20}
            value={ex.sets ?? ""}
            onChange={(e) => onChange({ ...ex, sets: num(e.target.value) })}
            className="w-14 rounded border border-[#ddd] p-1.5"
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-[#666]">
          <select
            value={ex.measure ?? "reps"}
            onChange={(e) =>
              onChange(
                e.target.value === "seconds"
                  ? { ...ex, measure: "seconds" }
                  : { ...ex, measure: undefined }
              )
            }
            aria-label="Cómo se registra"
            className="rounded border border-[#ddd] p-1.5"
          >
            <option value="reps">Reps</option>
            <option value="seconds">Reps o seg.</option>
          </select>
          <input
            value={ex.reps ?? ""}
            onChange={(e) => onChange({ ...ex, reps: e.target.value })}
            aria-label="Objetivo por serie (repeticiones o segundos)"
            className="w-16 rounded border border-[#ddd] p-1.5"
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-[#666]">
          Descanso (s)
          <input
            type="number"
            min={0}
            max={600}
            value={ex.rest_seconds ?? ""}
            onChange={(e) => onChange({ ...ex, rest_seconds: num(e.target.value) })}
            className="w-16 rounded border border-[#ddd] p-1.5"
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-[#666]">
          Peso (kg)
          <input
            type="number"
            min={0}
            max={500}
            step="0.5"
            value={ex.target_weight_kg ?? ""}
            onChange={(e) => onChange({ ...ex, target_weight_kg: num(e.target.value) })}
            className="w-16 rounded border border-[#ddd] p-1.5"
          />
        </label>
        <button type="button" onClick={onRemove} className="text-danger" title="Quitar">
          ✕
        </button>
      </div>
      <label className="mt-2 flex items-center gap-2 pl-6 text-xs text-[#666]">
        Notas
        <input
          value={ex.description ?? ""}
          onChange={(e) => onChange({ ...ex, description: e.target.value || undefined })}
          placeholder="Explicación breve del ejercicio (opcional)"
          maxLength={500}
          className="flex-1 rounded border border-[#ddd] p-1.5"
        />
      </label>
    </div>
  );
}

// ─── Builder de dos paneles ───
export function RoutineBuilder({
  initial,
  onSave,
  saving,
  error,
}: {
  initial: RoutineDraft;
  onSave: (draft: RoutineDraft) => void;
  saving: boolean;
  error: string | null;
}) {
  const [draft, setDraft] = useState<RoutineDraft>(initial);
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [search, setSearch] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: "routine-drop" });

  useEffect(() => {
    const t = setTimeout(async () => {
      setLibrary(await apiFetch<LibraryExercise[]>(`/exercises${search ? `?search=${encodeURIComponent(search)}` : ""}`));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  function addFromLibrary(lib: LibraryExercise) {
    setDraft((d) => ({ ...d, exercises: [...d.exercises, toRoutineExercise(lib)] }));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);

    // Soltar tarjeta de librería sobre la rutina (zona o cualquier fila)
    if (activeId.startsWith("lib-")) {
      const lib = library.find((l) => `lib-${l.id}` === activeId);
      if (lib) addFromLibrary(lib);
      return;
    }

    // Reordenar dentro de la rutina
    if (activeId !== String(over.id)) {
      setDraft((d) => {
        const oldIndex = d.exercises.findIndex((e) => e.id === activeId);
        const newIndex = d.exercises.findIndex((e) => e.id === String(over.id));
        if (oldIndex < 0 || newIndex < 0) return d;
        return { ...d, exercises: arrayMove(d.exercises, oldIndex, newIndex) };
      });
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Panel izquierdo: la rutina */}
        <div className="flex-1 space-y-4">
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Nombre de la rutina *"
            className="w-full rounded-lg border border-[#ddd] p-3 text-lg font-semibold"
          />
          <textarea
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="Descripción *"
            rows={2}
            className="w-full rounded-lg border border-[#ddd] p-3"
          />
          <div className="flex gap-3">
            <select
              value={draft.difficulty}
              onChange={(e) => setDraft({ ...draft, difficulty: e.target.value as Difficulty })}
              className="rounded-lg border border-[#ddd] p-2.5"
            >
              <option value="BEGINNER">Principiante</option>
              <option value="INTERMEDIATE">Intermedio</option>
              <option value="ADVANCED">Avanzado</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-[#666]">
              Duración (min)
              <input
                type="number"
                min={5}
                max={180}
                value={draft.duration_minutes}
                onChange={(e) => setDraft({ ...draft, duration_minutes: Number(e.target.value) })}
                className="w-20 rounded-lg border border-[#ddd] p-2.5"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.is_published}
                onChange={(e) => setDraft({ ...draft, is_published: e.target.checked })}
              />
              Publicada
            </label>
          </div>

          <div
            ref={setDropRef}
            className={`min-h-48 space-y-2 rounded-xl border-2 border-dashed p-4 ${
              isOver ? "border-primary bg-primary/5" : "border-[#ddd]"
            }`}
          >
            <SortableContext items={draft.exercises.map((e) => e.id)} strategy={verticalListSortingStrategy}>
              {draft.exercises.map((ex, i) => (
                <ExerciseRow
                  key={ex.id}
                  ex={ex}
                  onChange={(updated) =>
                    setDraft((d) => ({
                      ...d,
                      exercises: d.exercises.map((e, j) => (j === i ? updated : e)),
                    }))
                  }
                  onRemove={() =>
                    setDraft((d) => ({ ...d, exercises: d.exercises.filter((_, j) => j !== i) }))
                  }
                />
              ))}
            </SortableContext>
            {draft.exercises.length === 0 && (
              <p className="py-10 text-center text-sm text-[#999]">
                Arrastra ejercicios de la librería aquí (o usa el botón +)
              </p>
            )}
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            onClick={() => onSave(draft)}
            disabled={saving || !draft.title || draft.exercises.length === 0}
            className="rounded-lg bg-primary px-6 py-3 font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar rutina"}
          </button>
        </div>

        {/* Panel derecho: librería */}
        <aside className="w-full space-y-3 rounded-xl border border-[#ddd] bg-surface p-4 lg:w-80 lg:shrink-0">
          <h2 className="font-semibold">Librería de ejercicios</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar un ejercicio…"
            className="w-full rounded-lg border border-[#ddd] p-2.5"
          />
          <p className="text-xs text-[#999]">{library.length} ejercicios</p>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {library.map((lib) => (
              <LibraryCard key={lib.id} lib={lib} onAdd={() => addFromLibrary(lib)} />
            ))}
          </div>
        </aside>
      </div>
    </DndContext>
  );
}
