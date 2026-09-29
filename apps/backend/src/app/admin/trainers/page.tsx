"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import type { CommissionTier, PlatformSettingsDto } from "@truerep/shared";

type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: "USER" | "TRAINER";
  is_superadmin: boolean;
  stripe_charges_enabled: boolean;
  commission_percent_override: number | null;
  commission_percent_applied: number | null;
  active_stripe_clients: number;
  active_cash_clients: number;
};

/** "7,5" → 7.5; vacío → null */
function parseNumber(v: string): number | null {
  const t = v.trim().replace(",", ".");
  return t ? Number(t) : null;
}

function PlatformSettingsForm() {
  const [tiers, setTiers] = useState<{ max: string; pct: string }[]>([]);
  const [fee, setFee] = useState("");
  const [currency, setCurrency] = useState("eur");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function show(s: PlatformSettingsDto) {
    setTiers(s.commission_tiers.map((t) => ({ max: t.max?.toString() ?? "", pct: String(t.pct) })));
    setFee((s.cash_fee_amount / 100).toFixed(2).replace(".", ","));
    setCurrency(s.cash_fee_currency);
  }

  useEffect(() => {
    apiFetch<PlatformSettingsDto>("/admin/settings").then(show).catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const commission_tiers: CommissionTier[] = tiers.map((t, i) => ({
        max: i === tiers.length - 1 ? null : parseNumber(t.max),
        pct: parseNumber(t.pct) ?? NaN,
      }));
      show(
        await apiFetch<PlatformSettingsDto>("/admin/settings", {
          method: "PUT",
          body: JSON.stringify({ commission_tiers, cash_fee_amount: Math.round((parseNumber(fee) ?? 0) * 100) }),
        })
      );
      setMessage({ ok: true, text: "Guardado. Las suscripciones se actualizan en unos segundos." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "No se ha podido guardar" });
    } finally {
      setSaving(false);
    }
  }

  const update = (i: number, key: "max" | "pct", value: string) =>
    setTiers(tiers.map((t, j) => (j === i ? { ...t, [key]: value } : t)));

  return (
    <form onSubmit={save} className="mt-8 rounded-xl border border-[#ddd] p-4">
      <h2 className="font-semibold">Comisión y cuota</h2>
      <p className="mt-1 text-xs text-[#666]">
        La comisión se cobra en cada pago con Stripe, según los clientes activos del entrenador. La cuota se cobra
        cada mes por cada cliente en efectivo activo, con factura por email.
      </p>
      <table className="mt-4 text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-[#666]">
            <th className="pb-1 pr-3">Hasta (clientes activos)</th>
            <th className="pb-1 pr-3">Comisión %</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {tiers.map((t, i) => {
            const last = i === tiers.length - 1;
            return (
              <tr key={i}>
                <td className="py-1 pr-3">
                  {last ? (
                    <span className="text-[#666]">Sin límite</span>
                  ) : (
                    <input
                      inputMode="numeric"
                      value={t.max}
                      onChange={(e) => update(i, "max", e.target.value)}
                      aria-label={`Límite del tramo ${i + 1}`}
                      className="w-24 rounded border border-[#ddd] p-1.5"
                    />
                  )}
                </td>
                <td className="py-1 pr-3">
                  <input
                    inputMode="decimal"
                    value={t.pct}
                    onChange={(e) => update(i, "pct", e.target.value)}
                    aria-label={`Comisión del tramo ${i + 1}`}
                    className="w-20 rounded border border-[#ddd] p-1.5"
                  />
                </td>
                <td className="py-1">
                  {tiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setTiers(tiers.filter((_, j) => j !== i))}
                      className="text-xs text-danger underline"
                    >
                      Quitar
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button
        type="button"
        onClick={() => setTiers([...tiers.slice(0, -1), { max: "", pct: "" }, ...tiers.slice(-1)])}
        className="mt-2 text-xs text-secondary underline"
      >
        Añadir tramo
      </button>
      <label className="mt-4 flex w-56 flex-col gap-1 text-sm">
        Cuota por cliente en efectivo ({currency.toUpperCase()}/mes)
        <input
          inputMode="decimal"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          className="rounded-lg border border-[#ddd] p-2"
        />
      </label>
      <button
        disabled={saving}
        className="mt-4 rounded-lg bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        {saving ? "Guardando…" : "Guardar"}
      </button>
      {message && <p className={`mt-2 text-sm ${message.ok ? "text-[#15803d]" : "text-danger"}`}>{message.text}</p>}
    </form>
  );
}

export default function AdminTrainersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    try {
      setUsers(await apiFetch<AdminUser[]>("/admin/trainers"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function patch(u: AdminUser, body: Record<string, unknown>) {
    setBusy(u.id);
    setActionError(null);
    try {
      await apiFetch(`/admin/trainers/${u.id}`, { method: "PATCH", body: JSON.stringify(body) });
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  if (error) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-2xl font-bold">Acceso restringido</h1>
        <p className="mt-4 text-[#666]">{error}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-bold">Administración de trainers</h1>
      <p className="mt-2 text-sm text-[#666]">
        Promueve usuarios a trainer para darles acceso al backoffice y ajusta lo que cobra TrueRep.
      </p>

      <PlatformSettingsForm />

      {actionError && <p className="mt-4 text-sm text-danger">{actionError}</p>}
      <table className="mt-8 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#ddd] text-xs uppercase text-[#666]">
            <th className="py-2">Usuario</th>
            <th>Rol</th>
            <th>Clientes activos</th>
            <th>Comisión propia %</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-[#eee]">
              <td className="py-3">
                <p className="font-medium">{u.username}</p>
                <p className="text-xs text-[#999]">{u.email}</p>
              </td>
              <td>
                <span className={u.role === "TRAINER" ? "font-semibold text-primary" : "text-[#666]"}>{u.role}</span>
                {u.is_superadmin && <span className="ml-2 text-xs text-secondary">admin</span>}
              </td>
              <td className="text-xs text-[#666]">
                {u.role === "TRAINER" && (
                  <>
                    {u.active_stripe_clients} Stripe · {u.active_cash_clients} efectivo
                    {u.commission_percent_applied != null && <p>Cobra {u.commission_percent_applied} %</p>}
                  </>
                )}
              </td>
              <td>
                {u.role === "TRAINER" && (
                  <input
                    key={`${u.id}-${u.commission_percent_override}`}
                    inputMode="decimal"
                    defaultValue={u.commission_percent_override?.toString() ?? ""}
                    placeholder="Tramos"
                    disabled={busy === u.id}
                    aria-label={`Comisión propia de ${u.username}`}
                    onBlur={(e) => {
                      const value = parseNumber(e.target.value);
                      if (value !== u.commission_percent_override) patch(u, { commission_percent_override: value });
                    }}
                    className="w-20 rounded border border-[#ddd] p-1.5"
                  />
                )}
              </td>
              <td className="text-right">
                {u.is_superadmin ? (
                  <span className="text-xs text-[#999]">—</span>
                ) : u.role === "TRAINER" ? (
                  <button
                    disabled={busy === u.id}
                    onClick={() => patch(u, { role: "USER" })}
                    className="text-danger underline disabled:opacity-50"
                  >
                    Quitar trainer
                  </button>
                ) : (
                  <button
                    disabled={busy === u.id}
                    onClick={() => patch(u, { role: "TRAINER" })}
                    className="rounded-lg bg-primary px-3 py-1.5 font-semibold text-white disabled:opacity-50"
                  >
                    Hacer trainer
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
