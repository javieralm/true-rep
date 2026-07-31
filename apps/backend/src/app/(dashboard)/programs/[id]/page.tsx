"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/client-api";
import type {
  Program,
  ProgramItem,
  ProgramItemType,
  ProgramTaskData,
  Routine,
} from "@truerep/shared";

type RoutineLite = Pick<Routine, "id" | "title" | "difficulty" | "duration_minutes">;
type Item = {
  id?: string;
  week: number;
  day: number;
  order: number;
  type: ProgramItemType;
  routine_id?: string | null;
  routine?: RoutineLite | null;
  data?: ProgramTaskData | null;
};
type ProgramFull = Program & {
  items: (Omit<ProgramItem, "routine"> & { routine: RoutineLite | null })[];
  assignments: Array<{ id: string; user: { id: string; username: string; email: string } }>;
};
type PremiumUser = { id: string; username: string; email: string };

// Estilo de cada tipo de tarea en el calendario (estilo Harbiz)
const TASK_META: Record<ProgramItemType, { label: string; icon: string; color: string }> = {
  ROUTINE: { label: "Workout", icon: "🏋", color: "#F7B801" },
  MESSAGE: { label: "Mensaje", icon: "💬", color: "#7C3AED" },
  VIDEO: { label: "Vídeo", icon: "🎬", color: "#004E89" },
  NOTE: { label: "Nota / Actividad", icon: "📝", color: "#6B7280" },
  SESSION: { label: "Sesión", icon: "📅", color: "#2ECC71" },
};

export default function ProgramEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [program, setProgram] = useState<ProgramFull | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // Modal añadir tarea
  const [pickerDay, setPickerDay] = useState<{ week: number; day: number } | null>(null);
  const [pickerType, setPickerType] = useState<ProgramItemType | null>(null);
  const [routines, setRoutines] = useState<RoutineLite[]>([]);
  const [taskForm, setTaskForm] = useState<ProgramTaskData>({});

  // Modal de asignación
  const [assigning, setAssigning] = useState(false);
  const [premiumUsers, setPremiumUsers] = useState<PremiumUser[]>([]);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignDate, setAssignDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [weekCount, setWeekCount] = useState(1);

  useEffect(() => {
    apiFetch<ProgramFull>(`/programs/${id}`)
      .then((p) => {
        setProgram(p);
        setItems(p.items as Item[]);
        setName(p.name);
        setWeekCount(p.items.reduce((m, it) => Math.max(m, it.week), 1));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, [id]);

  function itemsFor(week: number, day: number) {
    return items
      .filter((it) => it.week === week && it.day === day)
      .sort((a, b) => a.order - b.order);
  }

  function addRoutine(week: number, day: number, routine: RoutineLite) {
    setItems((its) => [
      ...its,
      { week, day, order: itemsFor(week, day).length, type: "ROUTINE", routine_id: routine.id, routine },
    ]);
    closePicker();
  }

  function addTask(week: number, day: number, type: ProgramItemType, data: ProgramTaskData) {
    setItems((its) => [
      ...its,
      { week, day, order: itemsFor(week, day).length, type, data },
    ]);
    closePicker();
  }

  function removeItem(item: Item) {
    setItems((its) => its.filter((it) => it !== item));
  }

  function duplicateWeek(week: number) {
    const newWeek = weekCount + 1;
    setItems((its) => [
      ...its,
      ...its.filter((it) => it.week === week).map((it) => ({ ...it, id: undefined, week: newWeek })),
    ]);
    setWeekCount(newWeek);
  }

  function deleteWeek(week: number) {
    if (!confirm(`¿Eliminar la semana ${week}?`)) return;
    setItems((its) =>
      its
        .filter((it) => it.week !== week)
        .map((it) => (it.week > week ? { ...it, week: it.week - 1 } : it))
    );
    setWeekCount((w) => Math.max(1, w - 1));
  }

  const visibleWeeks = useMemo(
    () => Array.from({ length: weekCount }, (_, i) => i + 1),
    [weekCount]
  );

  async function openPicker(week: number, day: number) {
    setPickerDay({ week, day });
    setPickerType(null);
    setTaskForm({});
    if (routines.length === 0) {
      const mine = await apiFetch<RoutineLite[]>("/routines?mine=true&limit=100");
      setRoutines(mine);
    }
  }

  function closePicker() {
    setPickerDay(null);
    setPickerType(null);
    setTaskForm({});
  }

  function submitTask() {
    if (!pickerDay || !pickerType) return;
    addTask(pickerDay.week, pickerDay.day, pickerType, taskForm);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/programs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          items: items.map(({ week, day, order, type, routine_id, data }) => ({
            week,
            day,
            order,
            type,
            routine_id: type === "ROUTINE" ? routine_id : undefined,
            data: type === "ROUTINE" ? undefined : data,
          })),
        }),
      });
      setSavedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function openAssign() {
    setAssigning(true);
    setPremiumUsers(await apiFetch<PremiumUser[]>("/users/premium"));
  }

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch(`/programs/${id}/assign`, {
        method: "POST",
        body: JSON.stringify({
          user_id: assignUserId,
          start_date: new Date(assignDate).toISOString(),
        }),
      });
      setAssigning(false);
      const p = await apiFetch<ProgramFull>(`/programs/${id}`);
      setProgram(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al asignar");
    }
  }

  if (!program) return <p className="text-sm text-[#999]">{error ?? "Cargando…"}</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/programs" className="rounded-full border border-[#ddd] px-3 py-1 text-sm">
            ‹ Atrás
          </Link>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-transparent p-2 text-xl font-bold hover:border-[#ddd]"
          />
        </div>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-xs text-[#999]">Guardado {savedAt.toLocaleTimeString()}</span>}
          <button onClick={openAssign} className="rounded-lg border border-[#ddd] px-4 py-2 text-sm font-semibold">
            Asignar a cliente
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-primary px-5 py-2 font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      {program.assignments.length > 0 && (
        <p className="mt-2 text-sm text-[#666]">
          Asignado a: {program.assignments.map((a) => a.user.username).join(", ")}
        </p>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-8 space-y-10">
        {visibleWeeks.map((week) => (
          <section key={week}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Semana {week}</h2>
              <div className="flex gap-2 text-sm">
                <button onClick={() => duplicateWeek(week)} className="rounded border border-[#ddd] px-2 py-1" title="Duplicar semana">
                  ⧉ Duplicar
                </button>
                <button onClick={() => deleteWeek(week)} className="rounded border border-[#ddd] px-2 py-1 text-danger" title="Eliminar semana">
                  🗑
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-3">
              {Array.from({ length: 7 }, (_, i) => i + 1).map((day) => (
                <div key={day} className="min-h-28 rounded-lg bg-[#f4f4f4] p-2">
                  <p className="text-xs text-[#999]">Día {(week - 1) * 7 + day}</p>
                  <div className="mt-2 space-y-1.5">
                    {itemsFor(week, day).map((item, i) => {
                      const meta = TASK_META[item.type];
                      const label =
                        item.type === "ROUTINE"
                          ? item.routine?.title ?? "Rutina"
                          : item.data?.title || meta.label;
                      return (
                        <div
                          key={`${item.type}-${item.routine_id ?? i}-${i}`}
                          className="group flex items-center justify-between rounded px-2 py-1.5 text-xs font-semibold text-white"
                          style={{ backgroundColor: meta.color }}
                        >
                          <span className="truncate" title={label}>
                            {meta.icon} {label}
                          </span>
                          <button
                            onClick={() => removeItem(item)}
                            className="ml-1 hidden group-hover:block"
                            title="Quitar"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => openPicker(week, day)}
                    className="mt-2 w-full rounded-full border border-[#ddd] bg-white py-1 text-sm text-[#666]"
                    title="Añadir tarea"
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
        <button
          onClick={() => setWeekCount((w) => w + 1)}
          className="rounded-lg border border-dashed border-[#bbb] px-4 py-2 text-sm text-[#666]"
        >
          + Añadir semana
        </button>
      </div>

      {/* Modal añadir tarea */}
      {pickerDay && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40" onClick={closePicker}>
          <div onClick={(e) => e.stopPropagation()} className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold">
              Añadir tarea — Semana {pickerDay.week}, Día {pickerDay.day}
            </h2>

            {/* Paso 1: elegir tipo */}
            {!pickerType && (
              <div className="mt-4 space-y-2">
                {(Object.keys(TASK_META) as ProgramItemType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setPickerType(t)}
                    className="flex w-full items-center gap-3 rounded-lg border border-[#ddd] p-3 text-left hover:border-primary"
                  >
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: TASK_META[t].color }}
                    />
                    <span className="font-medium">
                      {TASK_META[t].icon} {TASK_META[t].label}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Paso 2a: rutina */}
            {pickerType === "ROUTINE" && (
              <div className="mt-4 space-y-2">
                {routines.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => addRoutine(pickerDay.week, pickerDay.day, r)}
                    className="flex w-full items-center justify-between rounded-lg border border-[#ddd] p-3 text-left hover:border-primary"
                  >
                    <span className="font-medium">{r.title}</span>
                    <span className="text-xs text-[#666]">
                      {r.difficulty.toLowerCase()} · {r.duration_minutes} min
                    </span>
                  </button>
                ))}
                {routines.length === 0 && <p className="text-sm text-[#999]">No tienes rutinas todavía.</p>}
              </div>
            )}

            {/* Paso 2b: mini-form para el resto de tipos */}
            {pickerType && pickerType !== "ROUTINE" && (
              <div className="mt-4 space-y-3">
                <input
                  value={taskForm.title ?? ""}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="Título"
                  className="w-full rounded-lg border border-[#ddd] p-2.5"
                />
                {pickerType === "VIDEO" && (
                  <input
                    value={taskForm.url ?? ""}
                    onChange={(e) => setTaskForm({ ...taskForm, url: e.target.value })}
                    placeholder="URL del vídeo (YouTube, Vimeo…) *"
                    type="url"
                    className="w-full rounded-lg border border-[#ddd] p-2.5"
                  />
                )}
                {(pickerType === "MESSAGE" || pickerType === "NOTE") && (
                  <textarea
                    value={taskForm.body ?? ""}
                    onChange={(e) => setTaskForm({ ...taskForm, body: e.target.value })}
                    placeholder={pickerType === "MESSAGE" ? "Mensaje a enviar…" : "Descripción de la actividad…"}
                    rows={3}
                    className="w-full rounded-lg border border-[#ddd] p-2.5"
                  />
                )}
                {pickerType === "SESSION" && (
                  <>
                    <select
                      value={taskForm.mode ?? "online"}
                      onChange={(e) => setTaskForm({ ...taskForm, mode: e.target.value as "presencial" | "online" })}
                      className="w-full rounded-lg border border-[#ddd] p-2.5"
                    >
                      <option value="online">Online</option>
                      <option value="presencial">Presencial</option>
                    </select>
                    <input
                      value={taskForm.location ?? ""}
                      onChange={(e) => setTaskForm({ ...taskForm, location: e.target.value })}
                      placeholder={taskForm.mode === "presencial" ? "Lugar" : "Enlace (Zoom, Meet…)"}
                      className="w-full rounded-lg border border-[#ddd] p-2.5"
                    />
                    <input
                      value={taskForm.time ?? ""}
                      onChange={(e) => setTaskForm({ ...taskForm, time: e.target.value })}
                      placeholder="Hora (ej. 18:30)"
                      className="w-full rounded-lg border border-[#ddd] p-2.5"
                    />
                  </>
                )}
                <div className="flex justify-between">
                  <button onClick={() => setPickerType(null)} className="px-4 py-2 text-sm text-[#666]">
                    ‹ Cambiar tipo
                  </button>
                  <button
                    onClick={submitTask}
                    disabled={
                      (pickerType === "VIDEO" && !taskForm.url) ||
                      (pickerType !== "VIDEO" && !taskForm.title && !taskForm.body)
                    }
                    className="rounded-lg bg-primary px-5 py-2 font-semibold text-white disabled:opacity-50"
                  >
                    Añadir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de asignación */}
      {assigning && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40" onClick={() => setAssigning(false)}>
          <form
            onSubmit={assign}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md space-y-3 rounded-xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-bold">Asignar programa a cliente</h2>
            <p className="text-sm text-[#666]">Solo miembros Premium activos.</p>
            <select
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              required
              className="w-full rounded-lg border border-[#ddd] p-2.5"
            >
              <option value="">Selecciona un cliente…</option>
              {premiumUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username} ({u.email})
                </option>
              ))}
            </select>
            {premiumUsers.length === 0 && (
              <p className="text-xs text-[#999]">No hay miembros Premium activos todavía.</p>
            )}
            <label className="block text-sm text-[#666]">
              Fecha de inicio (día 1 del programa)
              <input
                type="date"
                value={assignDate}
                onChange={(e) => setAssignDate(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-[#ddd] p-2.5"
              />
            </label>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setAssigning(false)} className="px-4 py-2 text-sm">
                Cancelar
              </button>
              <button className="rounded-lg bg-primary px-5 py-2 font-semibold text-white">Asignar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
