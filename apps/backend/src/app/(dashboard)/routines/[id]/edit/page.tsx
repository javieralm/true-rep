"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client-api";
import { RoutineBuilder, type RoutineDraft } from "../../routine-builder";
import type { Routine } from "@truerep/shared";

export default function EditRoutinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [initial, setInitial] = useState<RoutineDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<Routine>(`/routines/${id}`)
      .then((r) =>
        setInitial({
          title: r.title,
          description: r.description,
          difficulty: r.difficulty,
          duration_minutes: r.duration_minutes,
          is_published: r.is_published,
          exercises: r.exercises,
        })
      )
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, [id]);

  async function onSave(draft: RoutineDraft) {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/routines/${id}`, { method: "PATCH", body: JSON.stringify(draft) });
      router.push("/routines");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
      setSaving(false);
    }
  }

  if (!initial) return <p className="text-sm text-[#999]">{error ?? "Cargando…"}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Editar rutina</h1>
      <div className="mt-6">
        <RoutineBuilder initial={initial} onSave={onSave} saving={saving} error={error} />
      </div>
    </div>
  );
}
