import { PLAN_FEATURES } from "@truerep/shared";

const euro = (n: number) => `${n.toFixed(2).replace(".", ",")} €/mes`;

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-center text-3xl font-bold">Precios</h1>
      <p className="mt-2 text-center text-[#666]">
        Elige tu plan y entrena con progresión real desde el primer día.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-[#ddd] bg-surface p-6">
          <h2 className="text-lg font-semibold">{PLAN_FEATURES.BASE.name}</h2>
          <p className="mt-2 text-2xl font-bold text-primary">
            {euro(PLAN_FEATURES.BASE.price_eur_month)}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-[#666]">
            {PLAN_FEATURES.BASE.features.map((f) => (
              <li key={f}>✓ {f}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border-2 border-primary bg-surface p-6">
          <h2 className="text-lg font-semibold">
            {PLAN_FEATURES.PREMIUM.name}{" "}
            <span className="rounded bg-primary px-2 py-0.5 text-xs font-bold text-white">
              RECOMENDADO
            </span>
          </h2>
          <p className="mt-2 text-2xl font-bold text-primary">
            {euro(PLAN_FEATURES.PREMIUM.price_eur_month)}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-[#666]">
            {PLAN_FEATURES.PREMIUM.features.map((f) => (
              <li key={f}>✓ {f}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-8 text-center text-sm text-[#999]">
        Suscríbete desde la app móvil de TrueRep.
      </p>
    </main>
  );
}
