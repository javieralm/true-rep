"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewRoutinePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(e.currentTarget);

    // ponytail: ejercicios como "nombre | reps" por línea; editor estructurado si los trainers lo piden
    const exercises = String(form.get("exercises") ?? "")
      .split("\n")
      .map((line, i) => {
        const [name, reps] = line.split("|").map((s) => s.trim());
        return name ? { id: `ex-${i + 1}`, name, reps: reps || "3x10" } : null;
      })
      .filter(Boolean);

    const res = await fetch("/api/routines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        difficulty: form.get("difficulty"),
        duration_minutes: Number(form.get("duration_minutes")),
        exercises,
        is_published: form.get("is_published") === "on",
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (json.status === "error") return setError(json.message ?? "Failed to create routine");
    router.push("/routines");
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold">Create Routine</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input name="title" placeholder="Title" required minLength={5} className="w-full rounded-lg border border-[#ddd] p-3" />
        <textarea name="description" placeholder="Description" required className="w-full rounded-lg border border-[#ddd] p-3" rows={3} />
        <select name="difficulty" className="w-full rounded-lg border border-[#ddd] p-3" defaultValue="BEGINNER">
          <option value="BEGINNER">Beginner</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
        </select>
        <input name="duration_minutes" type="number" min={5} max={180} defaultValue={30} className="w-full rounded-lg border border-[#ddd] p-3" />
        <textarea
          name="exercises"
          placeholder={"One exercise per line: name | reps\nPush-ups | 3x12\nPlank | 3x30s"}
          required
          className="w-full rounded-lg border border-[#ddd] p-3 font-mono text-sm"
          rows={6}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_published" /> Publish immediately
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button disabled={saving} className="rounded-lg bg-primary px-6 py-3 font-semibold text-white disabled:opacity-50">
          {saving ? "Saving…" : "Create Routine"}
        </button>
      </form>
    </div>
  );
}
