"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import {
  TRAINER_COUNTRIES,
  TRAINER_CURRENCIES,
  type ConnectStatus,
  type PriceInterval,
  type TrainerPriceRow,
} from "@truerep/shared";

const INTERVALS: { key: PriceInterval; label: string }[] = [
  { key: "MONTH", label: "Mensual" },
  { key: "QUARTER", label: "Trimestral" },
  { key: "YEAR", label: "Anual" },
];

const countryName = new Intl.DisplayNames(["es"], { type: "region" });

/** "45,50" → 4550. Vacío → null (esa periodicidad no se ofrece). */
function toMinor(value: string): number | null {
  const v = value.trim().replace(",", ".");
  return v ? Math.round(Number(v) * 100) : null;
}

function toMajor(amount: number): string {
  return (amount / 100).toFixed(2).replace(".", ",");
}

export default function BillingPage() {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [country, setCountry] = useState<string>("ES");
  const [opening, setOpening] = useState(false);

  const [currency, setCurrency] = useState<string>("eur");
  const [amounts, setAmounts] = useState<Record<PriceInterval, string>>({ MONTH: "", QUARTER: "", YEAR: "" });
  const [saving, setSaving] = useState(false);

  function showPrices(rows: TrainerPriceRow[]) {
    if (rows[0]) setCurrency(rows[0].currency);
    setAmounts({
      MONTH: "",
      QUARTER: "",
      YEAR: "",
      ...Object.fromEntries(rows.map((p) => [p.interval, toMajor(p.amount)])),
    });
  }

  async function openOnboarding() {
    setOpening(true);
    setError(null);
    try {
      const { url } = await apiFetch<{ url: string }>("/stripe/connect/onboarding-link", {
        method: "POST",
        body: JSON.stringify({ country }),
      });
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setOpening(false);
    }
  }

  useEffect(() => {
    // Stripe vuelve aquí con ?refresh=1 cuando el enlace de alta ha caducado:
    // se pide otro y se sigue donde se quedó.
    if (new URLSearchParams(window.location.search).has("refresh")) {
      openOnboarding();
      return;
    }
    apiFetch<ConnectStatus>("/stripe/connect/status")
      .then(setStatus)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
    apiFetch<TrainerPriceRow[]>("/trainer/prices")
      .then(showPrices)
      .catch(() => {});
  }, []);

  async function savePrices(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const prices = Object.fromEntries(INTERVALS.map(({ key }) => [key, toMinor(amounts[key])]));
      showPrices(
        await apiFetch<TrainerPriceRow[]>("/trainer/prices", {
          method: "PUT",
          body: JSON.stringify({ currency, prices }),
        })
      );
      setNotice("Precios guardados. Quien ya estaba suscrito sigue con su precio.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se han podido guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">Cobros</h1>
      <p className="mt-1 text-sm text-[#666]">
        Tus clientes con pago por Stripe te pagan directamente a tu cuenta de Stripe. Tú pones el precio y la moneda.
      </p>

      <section className="mt-6 rounded-xl border border-[#ddd] bg-surface p-4">
        <h2 className="font-semibold">Cuenta de Stripe</h2>
        {!status && !error && <p className="mt-2 text-sm text-[#999]">Cargando…</p>}

        {status?.state === "not_connected" && (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              País desde el que cobras
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="rounded-lg border border-[#ddd] p-2.5"
              >
                {TRAINER_COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {countryName.of(c)}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={openOnboarding}
              disabled={opening}
              className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-white disabled:opacity-50"
            >
              {opening ? "Abriendo Stripe…" : "Conectar Stripe"}
            </button>
            <p className="w-full text-xs text-[#666]">
              Stripe te pedirá tus datos y tu cuenta bancaria. El país no se puede cambiar después.
            </p>
          </div>
        )}

        {status?.state === "onboarding" && (
          <div className="mt-3">
            <p className="text-sm">
              <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-xs font-semibold text-[#b45309]">
                Alta pendiente
              </span>{" "}
              Stripe aún necesita datos para que puedas cobrar.
            </p>
            <button
              onClick={openOnboarding}
              disabled={opening}
              className="mt-3 rounded-lg bg-primary px-5 py-2.5 font-semibold text-white disabled:opacity-50"
            >
              {opening ? "Abriendo Stripe…" : "Continuar el alta en Stripe"}
            </button>
          </div>
        )}

        {status?.state === "ready" && (
          <p className="mt-3 text-sm">
            <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-xs font-semibold text-[#15803d]">
              Puedes cobrar
            </span>{" "}
            Pagos, reembolsos y transferencias en tu{" "}
            <a href={status.dashboard_url ?? undefined} target="_blank" rel="noreferrer" className="text-secondary underline">
              panel de Stripe
            </a>
            .
          </p>
        )}
      </section>

      {status && status.state !== "not_connected" && (
        <form onSubmit={savePrices} className="mt-6 rounded-xl border border-[#ddd] bg-surface p-4">
          <h2 className="font-semibold">Tus precios</h2>
          <p className="mt-1 text-xs text-[#666]">
            Deja vacía una periodicidad para no ofrecerla. El cliente elige entre las que pongas.
          </p>
          <label className="mt-4 flex w-40 flex-col gap-1 text-sm">
            Moneda
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-lg border border-[#ddd] p-2.5"
            >
              {TRAINER_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-4 flex flex-wrap gap-3">
            {INTERVALS.map(({ key, label }) => (
              <label key={key} className="flex flex-col gap-1 text-sm">
                {label}
                <input
                  inputMode="decimal"
                  pattern="\d+([.,]\d{1,2})?"
                  value={amounts[key]}
                  onChange={(e) => setAmounts({ ...amounts, [key]: e.target.value })}
                  placeholder="Sin ofrecer"
                  className="w-36 rounded-lg border border-[#ddd] p-2.5"
                />
              </label>
            ))}
          </div>
          <button
            disabled={saving}
            className="mt-4 rounded-lg bg-primary px-5 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar precios"}
          </button>
        </form>
      )}

      {notice && <p className="mt-3 text-sm text-[#15803d]">{notice}</p>}
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}
