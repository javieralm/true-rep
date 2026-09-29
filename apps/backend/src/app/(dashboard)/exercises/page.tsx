"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import type { ExerciseMeasure, LibraryExercise } from "@truerep/shared";

const empty = {
  name: "",
  measure: "reps" as ExerciseMeasure,
  muscle_group: "",
  equipment: "",
  video_url: "",
  description: "",
};

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<LibraryExercise[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<LibraryExercise | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setExercises(await apiFetch<LibraryExercise[]>(`/exercises${search ? `?search=${encodeURIComponent(search)}` : ""}`));
  }

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce búsqueda
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setError(null);
    setShowModal(true);
  }

  function openEdit(ex: LibraryExercise) {
    setEditing(ex);
    setForm({
      name: ex.name,
      measure: ex.measure,
      muscle_group: ex.muscle_group ?? "",
      equipment: ex.equipment ?? "",
      video_url: ex.video_url ?? "",
      description: ex.description ?? "",
    });
    setError(null);
    setShowModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    // Campos vacíos fuera del payload (los schemas los tienen como opcionales)
    const body = JSON.stringify(
      Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""))
    );
    try {
      if (editing) await apiFetch(`/exercises/${editing.id}`, { method: "PATCH", body });
      else await apiFetch(`/exercises`, { method: "POST", body });
      setShowModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(ex: LibraryExercise) {
    if (!confirm(`¿Eliminar "${ex.name}"?`)) return;
    await apiFetch(`/exercises/${ex.id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Librería de ejercicios</h1>
        <button onClick={openCreate} className="rounded-lg bg-primary px-4 py-2 font-semibold text-white">
          + Nuevo
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar un ejercicio…"
          className="w-72 rounded-lg border border-[#ddd] p-2.5"
        />
        <span className="rounded border border-[#ddd] px-2 py-1 text-xs text-[#666]">
          {exercises.length} ejercicios
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {exercises.map((ex) => (
          <div key={ex.id} className="rounded-lg border border-[#ddd] bg-surface p-4">
            <div className="flex items-start justify-between">
              <h2 className="font-semibold">{ex.name}</h2>
              {ex.video_url && (
                <a href={ex.video_url} target="_blank" rel="noreferrer" title="Ver vídeo">
                  👁
                </a>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1 text-[11px] uppercase text-[#666]">
              {ex.measure === "seconds" && <span className="rounded bg-[#eee] px-2 py-0.5">Por segundos</span>}
              {ex.muscle_group && <span className="rounded bg-[#eee] px-2 py-0.5">{ex.muscle_group}</span>}
              {ex.equipment && <span className="rounded bg-[#eee] px-2 py-0.5">{ex.equipment}</span>}
            </div>
            <div className="mt-3 flex gap-3 text-sm">
              <button onClick={() => openEdit(ex)} className="text-secondary underline">
                Editar
              </button>
              <button onClick={() => remove(ex)} className="text-danger underline">
                Eliminar
              </button>
            </div>
          </div>
        ))}
        {exercises.length === 0 && (
          <p className="text-sm text-[#999]">Aún no hay ejercicios. Crea el primero.</p>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <form
            onSubmit={save}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md space-y-3 rounded-xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-bold">{editing ? "Editar ejercicio" : "Nuevo ejercicio"}</h2>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre *"
              required
              minLength={2}
              className="w-full rounded-lg border border-[#ddd] p-2.5"
            />
            <fieldset className="flex items-center gap-4 text-sm">
              <legend className="sr-only">Cómo se cuenta</legend>
              <span className="text-[#666]">Se cuenta en</span>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="measure"
                  checked={form.measure === "reps"}
                  onChange={() => setForm({ ...form, measure: "reps" })}
                />
                Repeticiones
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="measure"
                  checked={form.measure === "seconds"}
                  onChange={() => setForm({ ...form, measure: "seconds" })}
                />
                Segundos (L-sit, plancha…)
              </label>
            </fieldset>
            <input
              value={form.muscle_group}
              onChange={(e) => setForm({ ...form, muscle_group: e.target.value })}
              placeholder="Grupo muscular (Tracción, Empuje…)"
              className="w-full rounded-lg border border-[#ddd] p-2.5"
            />
            <input
              value={form.equipment}
              onChange={(e) => setForm({ ...form, equipment: e.target.value })}
              placeholder="Equipamiento (Barra de dominadas…)"
              className="w-full rounded-lg border border-[#ddd] p-2.5"
            />
            <input
              value={form.video_url}
              onChange={(e) => setForm({ ...form, video_url: e.target.value })}
              placeholder="URL de vídeo técnica"
              type="url"
              className="w-full rounded-lg border border-[#ddd] p-2.5"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descripción"
              rows={3}
              className="w-full rounded-lg border border-[#ddd] p-2.5"
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm">
                Cancelar
              </button>
              <button disabled={saving} className="rounded-lg bg-primary px-5 py-2 font-semibold text-white disabled:opacity-50">
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
