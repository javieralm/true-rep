"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/client-api";
import type { BillingMode, ClientStatus, TrainerClientRow } from "@truerep/shared";

const STATUS_LABEL: Record<ClientStatus, string> = {
  INVITED: "Invitado",
  ACTIVE: "Activo",
  PAUSED: "Pausado",
  ENDED: "Finalizado",
};

const STATUS_CLASS: Record<ClientStatus, string> = {
  INVITED: "bg-[#eee] text-[#444]",
  ACTIVE: "bg-[#dcfce7] text-[#15803d]",
  PAUSED: "bg-[#fef3c7] text-[#b45309]",
  ENDED: "bg-[#eee] text-[#666]",
};

/** "Pagado hasta" ya pasado: el cliente se ha quedado sin acceso. */
function isOverdue(c: TrainerClientRow) {
  if (c.billing !== "CASH" || !c.paid_until) return false;
  return c.paid_until.slice(0, 10) < new Date().toISOString().slice(0, 10);
}

export default function ClientsPage() {
  const [clients, setClients] = useState<TrainerClientRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [billing, setBilling] = useState<BillingMode>("CASH");
  const [paidUntil, setPaidUntil] = useState("");
  const [inviting, setInviting] = useState(false);

  async function load() {
    try {
      setClients(await apiFetch<TrainerClientRow[]>("/clients"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch<{ email_sent: boolean }>("/clients", {
        method: "POST",
        body: JSON.stringify({ email, billing, ...(billing === "CASH" && paidUntil ? { paid_until: paidUntil } : {}) }),
      });
      setNotice(
        res.email_sent
          ? `Invitación enviada a ${email}.`
          : `Invitación creada, pero el correo no ha salido. Avisa a ${email} de que entre en la app con ese email.`
      );
      setEmail("");
      setPaidUntil("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se ha podido invitar");
    } finally {
      setInviting(false);
    }
  }

  async function update(id: string, patch: Record<string, unknown>) {
    setError(null);
    try {
      await apiFetch(`/client-relations/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se ha podido actualizar");
    }
  }

  async function revoke(c: TrainerClientRow) {
    if (!confirm(`¿Retirar la invitación a ${c.email}?`)) return;
    setError(null);
    try {
      await apiFetch(`/client-relations/${c.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se ha podido retirar");
    }
  }

  async function end(c: TrainerClientRow) {
    if (!confirm(`¿Dejar de entrenar a ${c.user?.username ?? c.email}? Perderá el acceso y su programa.`)) return;
    await update(c.id, { status: "ENDED" });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Clientes</h1>
      <p className="mt-1 text-sm text-[#666]">
        Solo entra en la app quien tú invites. Tú decides si te paga por Stripe o en efectivo, y cuándo tiene acceso.
      </p>

      <form onSubmit={invite} className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-[#ddd] bg-surface p-4">
        <label className="flex flex-col gap-1 text-sm">
          Email del cliente
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="cliente@email.com"
            className="w-72 rounded-lg border border-[#ddd] p-2.5"
          />
        </label>
        <fieldset className="flex flex-col gap-1 text-sm">
          <legend className="mb-1">Cómo te paga</legend>
          <div className="flex gap-3">
            <label className="flex items-center gap-1.5">
              <input type="radio" name="billing" checked={billing === "CASH"} onChange={() => setBilling("CASH")} />
              Efectivo
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="billing" checked={billing === "STRIPE"} onChange={() => setBilling("STRIPE")} />
              Stripe
            </label>
          </div>
        </fieldset>
        {billing === "CASH" && (
          <label className="flex flex-col gap-1 text-sm">
            Pagado hasta (opcional)
            <input
              type="date"
              value={paidUntil}
              onChange={(e) => setPaidUntil(e.target.value)}
              className="rounded-lg border border-[#ddd] p-2.5"
            />
          </label>
        )}
        <button
          disabled={inviting}
          className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {inviting ? "Invitando…" : "Invitar"}
        </button>
        {billing === "STRIPE" && (
          <p className="w-full text-xs text-[#666]">
            Tu cliente pagará desde la app con los precios que pongas en{" "}
            <Link href="/billing" className="text-secondary underline">
              Cobros
            </Link>
            .
          </p>
        )}
      </form>

      {notice && <p className="mt-3 text-sm text-[#15803d]">{notice}</p>}
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#ddd] text-xs uppercase text-[#666]">
            <th className="py-2">Cliente</th>
            <th>Estado</th>
            <th>Pago</th>
            <th>Programa</th>
            <th>Progreso</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id} className="border-b border-[#eee] align-top">
              <td className="py-3">
                <p className="font-medium">{c.user?.username ?? "Pendiente de entrar"}</p>
                <p className="text-xs text-[#666]">{c.email}</p>
              </td>
              <td className="py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[c.status]}`}>
                  {STATUS_LABEL[c.status]}
                </span>
                {isOverdue(c) && c.status === "ACTIVE" && (
                  <p className="mt-1 text-xs text-[#b45309]">Pago vencido: sin acceso</p>
                )}
              </td>
              <td className="py-3">
                <select
                  value={c.billing}
                  onChange={(e) => update(c.id, { billing: e.target.value })}
                  aria-label="Cómo te paga"
                  className="rounded border border-[#ddd] p-1"
                >
                  <option value="CASH">Efectivo</option>
                  <option value="STRIPE">Stripe</option>
                </select>
                {c.billing === "CASH" && (
                  <label className="mt-1 flex items-center gap-1 text-xs text-[#666]">
                    hasta
                    <input
                      type="date"
                      value={c.paid_until?.slice(0, 10) ?? ""}
                      onChange={(e) => update(c.id, { paid_until: e.target.value || null })}
                      aria-label="Pagado hasta"
                      className="rounded border border-[#ddd] p-1"
                    />
                  </label>
                )}
              </td>
              <td className="py-3">
                {c.program ? (
                  <>
                    <p>{c.program.name}</p>
                    <p className="text-xs text-[#666]">
                      {c.program.current_week === 0 ? "Empieza pronto" : `Semana ${c.program.current_week}`}
                    </p>
                  </>
                ) : (
                  <span className="text-xs text-[#999]">Sin programa</span>
                )}
              </td>
              <td className="py-3">
                {c.program && (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-[#eee]">
                      <div className="h-full bg-success" style={{ width: `${c.program.completion_percent}%` }} />
                    </div>
                    <span className="text-xs text-[#666]">
                      {c.program.completed_workouts}/{c.program.total_items}
                    </span>
                  </div>
                )}
              </td>
              <td className="space-x-3 py-3 text-right whitespace-nowrap">
                {c.status === "INVITED" && (
                  <button onClick={() => revoke(c)} className="text-danger underline">
                    Retirar invitación
                  </button>
                )}
                {c.status === "ACTIVE" && (
                  <button onClick={() => update(c.id, { status: "PAUSED" })} className="text-secondary underline">
                    Pausar acceso
                  </button>
                )}
                {c.status === "PAUSED" && (
                  <button onClick={() => update(c.id, { status: "ACTIVE" })} className="text-secondary underline">
                    Activar acceso
                  </button>
                )}
                {c.user && c.program && (
                  <Link href={`/clients/${c.user.id}`} className="text-secondary underline">
                    Seguimiento
                  </Link>
                )}
                {c.status !== "INVITED" && (
                  <button onClick={() => end(c)} className="text-[#666] underline">
                    Finalizar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {loaded && clients.length === 0 && (
        <p className="mt-4 text-sm text-[#999]">Aún no tienes clientes. Invita al primero con su email.</p>
      )}
    </div>
  );
}
