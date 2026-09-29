"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/client-api";

type Tracking = {
  user: { id: string; username: string; email: string; streak: number };
  program: { id: string; name: string };
  start_date: string;
  current_week: number;
  week: number;
  days: Array<{
    day: number;
    order: number;
    routine: { id: string; title: string };
    completed: boolean;
    workout_id: string | null;
    trainer_feedback: string | null;
  }>;
  weights: Array<{
    exercise_id: string;
    exercise_name: string;
    weight_kg: number;
    reps_done: number;
    date: string;
  }>;
  observations: Array<{
    exercise_id: string;
    exercise_name: string;
    note: string;
    date: string;
  }>;
};

const DAY_NAMES = ["", "Día 1", "Día 2", "Día 3", "Día 4", "Día 5", "Día 6", "Día 7"];

export default function ClientTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Tracking | null>(null);
  const [week, setWeek] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal de feedback del coach
  const [feedbackFor, setFeedbackFor] = useState<{ workout_id: string; title: string } | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);

  async function load() {
    try {
      setData(await apiFetch<Tracking>(`/clients/${id}/tracking${week ? `?week=${week}` : ""}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, week]);

  async function sendFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackFor) return;
    setSendingFeedback(true);
    try {
      await apiFetch(`/workouts/${feedbackFor.workout_id}/feedback`, {
        method: "POST",
        body: JSON.stringify({ feedback: feedbackText }),
      });
      setFeedbackFor(null);
      setFeedbackText("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar feedback");
    } finally {
      setSendingFeedback(false);
    }
  }

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!data) return <p className="text-sm text-[#999]">Cargando…</p>;

  return (
    <div>
      <Link href="/clients" className="rounded-full border border-[#ddd] px-3 py-1 text-sm">
        ‹ Clientes
      </Link>
      <div className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{data.user.username}</h1>
          <p className="text-sm text-[#666]">
            {data.program.name} · 🔥 racha de {data.user.streak} días
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <a
            href={`/api/clients/${id}/export`}
            download
            className="rounded-full border border-[#ddd] px-3 py-1"
          >
            ⬇ Exportar CSV
          </a>
          <button
            onClick={() => setWeek(Math.max(1, data.week - 1))}
            disabled={data.week <= 1}
            className="rounded border border-[#ddd] px-3 py-1 disabled:opacity-40"
          >
            ‹
          </button>
          <span>
            Semana {data.week}
            {data.week === data.current_week && " (actual)"}
          </span>
          <button
            onClick={() => setWeek(data.week + 1)}
            className="rounded border border-[#ddd] px-3 py-1"
          >
            ›
          </button>
        </div>
      </div>

      {/* Días de la semana */}
      <div className="mt-6 grid grid-cols-7 gap-3">
        {Array.from({ length: 7 }, (_, i) => i + 1).map((day) => {
          const dayItems = data.days.filter((d) => d.day === day);
          return (
            <div key={day} className="min-h-24 rounded-lg bg-[#f4f4f4] p-2">
              <p className="text-xs text-[#999]">{DAY_NAMES[day]}</p>
              <div className="mt-2 space-y-1.5">
                {dayItems.map((d, i) => (
                  <div key={i}>
                    <div
                      className={`rounded px-2 py-1.5 text-xs font-semibold text-white ${
                        d.completed ? "bg-success" : "bg-accent opacity-70"
                      }`}
                      title={d.completed ? "Completado" : "Pendiente"}
                    >
                      {d.completed ? "✓ " : ""}
                      {d.routine.title}
                    </div>
                    {d.workout_id && (
                      <button
                        onClick={() => {
                          setFeedbackFor({ workout_id: d.workout_id!, title: d.routine.title });
                          setFeedbackText(d.trainer_feedback ?? "");
                        }}
                        className="mt-1 w-full rounded border border-[#ddd] bg-white px-1 py-0.5 text-[10px] text-[#666]"
                        title={d.trainer_feedback ?? "Dejar feedback"}
                      >
                        {d.trainer_feedback ? "💬 Editar feedback" : "💬 Feedback"}
                      </button>
                    )}
                  </div>
                ))}
                {dayItems.length === 0 && <p className="text-xs text-[#ccc]">Descanso</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Observaciones del cliente: lo que ha notado en cada ejercicio, para
          ajustar la rutina. Van antes que los pesos porque piden una acción. */}
      <h2 className="mt-10 text-lg font-bold">Observaciones del cliente</h2>
      {data.observations.length === 0 ? (
        <p className="mt-2 text-sm text-[#999]">Sin observaciones esta semana.</p>
      ) : (
        <ul className="mt-4 max-w-2xl space-y-3">
          {data.observations.map((o, i) => (
            <li key={i} className="rounded-lg border border-[#ddd] bg-white p-3">
              <p className="text-sm font-semibold">
                {o.exercise_name}{" "}
                <span className="font-normal text-[#666]">
                  · {new Date(o.date).toLocaleDateString("es-ES")}
                </span>
              </p>
              <p className="mt-1 text-sm">{o.note}</p>
            </li>
          ))}
        </ul>
      )}

      {/* Pesos de la semana */}
      <h2 className="mt-10 text-lg font-bold">Pesos registrados esta semana</h2>
      {data.weights.length === 0 ? (
        <p className="mt-2 text-sm text-[#999]">Sin registros de peso esta semana.</p>
      ) : (
        <table className="mt-4 w-full max-w-2xl text-left text-sm">
          <thead>
            <tr className="border-b border-[#ddd] text-xs uppercase text-[#666]">
              <th className="py-2">Ejercicio</th>
              <th>Peso</th>
              <th>Reps</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {data.weights.map((w, i) => (
              <tr key={i} className="border-b border-[#eee]">
                <td className="py-2 font-medium">{w.exercise_name}</td>
                <td>{w.weight_kg} kg</td>
                <td>{w.reps_done}</td>
                <td className="text-[#666]">{new Date(w.date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal de feedback del coach */}
      {feedbackFor && (
        <div
          className="fixed inset-0 z-10 flex items-center justify-center bg-black/40"
          onClick={() => setFeedbackFor(null)}
        >
          <form
            onSubmit={sendFeedback}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md space-y-3 rounded-xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-bold">Feedback — {feedbackFor.title}</h2>
            <p className="text-sm text-[#666]">
              El cliente recibirá una notificación push con tu comentario.
            </p>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Buen trabajo con las dominadas. La próxima semana sube a 4 series…"
              required
              minLength={3}
              maxLength={2000}
              rows={4}
              autoFocus
              className="w-full rounded-lg border border-[#ddd] p-2.5"
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setFeedbackFor(null)} className="px-4 py-2 text-sm">
                Cancelar
              </button>
              <button
                disabled={sendingFeedback}
                className="rounded-lg bg-primary px-5 py-2 font-semibold text-white disabled:opacity-50"
              >
                {sendingFeedback ? "Enviando…" : "Enviar feedback"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
