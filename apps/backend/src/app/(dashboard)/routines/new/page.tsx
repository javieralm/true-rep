"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client-api";
import { RoutineBuilder, emptyDraft, type RoutineDraft } from "../routine-builder";

export default function NewRoutinePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSave(draft: RoutineDraft) {
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/routines", { method: "POST", body: JSON.stringify(draft) });
      router.push("/routines");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear la rutina");
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Crear rutina</h1>
      <div className="mt-6">
        <RoutineBuilder initial={emptyDraft} onSave={onSave} saving={saving} error={error} />
      </div>
    </div>
  );
}
