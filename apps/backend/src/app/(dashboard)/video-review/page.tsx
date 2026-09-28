"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import type { PendingReviewFeedback } from "@truerep/shared";

export default function VideoReviewPage() {
  const [items, setItems] = useState<PendingReviewFeedback[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);

  function load() {
    return apiFetch<PendingReviewFeedback[]>("/video-feedback/pending-review")
      .then(setItems)
      .finally(() => setLoaded(true));
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id: string) {
    setApproving(id);
    try {
      await apiFetch(`/video-feedback/${id}/review`, { method: "POST" });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not approve review");
    } finally {
      setApproving(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Revisión de vídeos</h1>
      <p className="mt-1 text-sm text-[#666]">
        El análisis de IA (OpenAI Vision) no corre solo — apruébalo aquí primero. Ver el vídeo
        antes de aprobar te da la oportunidad de dar feedback manual en su lugar.
      </p>
      {!loaded ? (
        <p className="mt-6 text-sm text-[#999]">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-[#999]">No hay vídeos pendientes de revisión.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-[#ddd] p-4"
            >
              <div>
                <p className="font-medium">{item.user.username}</p>
                <p className="text-sm text-[#666]">{item.exercise_name}</p>
                <a
                  href={item.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary underline"
                >
                  Ver vídeo
                </a>
              </div>
              <button
                onClick={() => approve(item.id)}
                disabled={approving === item.id}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {approving === item.id ? "Aprobando…" : "Aprobar análisis de IA"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
