"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client-api";

export function ApplicationForm() {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await apiFetch("/trainer-application", { method: "POST", body: JSON.stringify({ note }) });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se ha podido enviar");
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Cuéntanos quién eres (opcional)
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="Tu experiencia, cuántos clientes entrenas, tu Instagram o web…"
          className="rounded-lg border border-[#ddd] p-2.5"
        />
      </label>
      <button
        disabled={sending}
        className="self-start rounded-lg bg-primary px-5 py-2.5 font-semibold text-white disabled:opacity-50"
      >
        {sending ? "Enviando…" : "Solicitar ser entrenador"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
