const plans = [
  { name: "Free", price: "$0", features: ["Browse routines", "Log workouts", "Join challenges"] },
  {
    name: "Premium Monthly",
    price: "$9.99/mo",
    features: ["Everything in Free", "AI form feedback", "Advanced routines"],
  },
  {
    name: "Premium Annual",
    price: "$79.99/yr",
    features: ["Everything in Monthly", "2 months free"],
  },
];

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-center text-3xl font-bold">Pricing</h1>
      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.name} className="rounded-lg border border-[#ddd] bg-surface p-6">
            <h2 className="text-lg font-semibold">{plan.name}</h2>
            <p className="mt-2 text-2xl font-bold text-primary">{plan.price}</p>
            <ul className="mt-4 space-y-2 text-sm text-[#666]">
              {plan.features.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-[#999]">
        Subscribe from the TrueRep mobile app.
      </p>
    </main>
  );
}
