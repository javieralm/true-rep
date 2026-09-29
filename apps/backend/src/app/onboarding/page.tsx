import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { getOrSyncUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { platformSettings } from "@/lib/platform";
import { ApplicationForm } from "./ApplicationForm";

export const metadata = { title: "Primeros pasos · TrueRep" };

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: currency.toUpperCase() }).format(amount / 100);
}

const STEPS = [
  [
    "Tus clientes, por invitación",
    "Solo entra en la app quien tú invites por email. Cada cliente es tuyo: tú activas, pausas o terminas su acceso.",
  ],
  [
    "Cobra como prefieras",
    "Por Stripe, con tus precios y tu moneda (mensual, trimestral o anual), directo a tu cuenta. O en efectivo, marcando hasta cuándo ha pagado.",
  ],
  [
    "Monta tus entrenamientos",
    "Crea tus ejercicios con vídeo de técnica, júntalos en rutinas y organiza las rutinas en un programa por semanas.",
  ],
  [
    "Sigue su progreso",
    "Asigna el programa a cada cliente. Él registra cada serie en la app y tú ves cómo lo lleva y le dejas observaciones.",
  ],
];

/** Cómo funciona TrueRep para un entrenador. Lo ve quien solicita serlo (para
 * saber a qué se apunta) y el entrenador aprobado (como guía de arranque). */
async function HowItWorks() {
  const settings = await platformSettings(db);
  const tiers = settings.commission_tiers
    .map((t, i, all) => {
      const from = i === 0 ? 1 : (all[i - 1].max ?? 0) + 1;
      return t.max == null ? `${t.pct} % a partir de ${from}` : `${t.pct} % de ${from} a ${t.max}`;
    })
    .join(" · ");

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">Cómo funciona</h2>
      <ol className="mt-4 flex flex-col gap-4">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              {i + 1}
            </span>
            <div>
              <p className="font-medium">{title}</p>
              <p className="text-sm text-[#666]">{body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-6 rounded-xl bg-surface p-4 text-sm">
        <p className="font-medium">Lo que cobra TrueRep</p>
        <p className="mt-1 text-[#666]">
          Por cada pago con Stripe, una comisión según tus clientes activos: {tiers}. Las comisiones de Stripe van
          aparte y las paga tu cuenta de Stripe.
        </p>
        {settings.cash_fee_amount > 0 && (
          <p className="mt-1 text-[#666]">
            Por cada cliente en efectivo activo, {money(settings.cash_fee_amount, settings.cash_fee_currency)} al mes,
            con factura por email.
          </p>
        )}
      </div>
    </section>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between">
      <Link href="/" className="text-xl font-bold">
        True<span className="text-primary">Rep</span>
      </Link>
      <UserButton />
    </header>
  );
}

export default async function OnboardingPage() {
  const user = await getOrSyncUser();
  if (!user) redirect("/sign-in");

  if (user.role !== "TRAINER") {
    const pending = !!user.trainer_requested_at;
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <Header />
        {pending ? (
          <>
            <h1 className="mt-10 text-2xl font-bold">Solicitud recibida</h1>
            <p className="mt-2 text-[#666]">
              La revisamos y activamos tu cuenta de entrenador. Cuando esté lista, vuelve a entrar aquí y verás tu
              panel.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-10 text-2xl font-bold">Hazte entrenador en TrueRep</h1>
            <p className="mt-2 text-[#666]">
              Gestiona a tus clientes de calistenia: sus programas, su progreso y sus pagos, en un solo sitio.
            </p>
            <ApplicationForm />
          </>
        )}
        <HowItWorks />
      </main>
    );
  }

  const [exercises, routines, programs, clients, assigned, prices] = await Promise.all([
    db.exercise.count({ where: { trainer_id: user.id, deleted_at: null } }),
    db.routine.count({ where: { trainer_id: user.id, deleted_at: null } }),
    db.program.count({ where: { trainer_id: user.id, deleted_at: null } }),
    db.trainerClient.count({ where: { trainer_id: user.id, status: { not: "ENDED" } } }),
    db.programAssignment.count({ where: { is_active: true, program: { trainer_id: user.id } } }),
    db.trainerPrice.count({ where: { trainer_id: user.id, active: true } }),
  ]);
  const tasks = [
    { done: exercises > 0, title: "Crea tus ejercicios", body: "Con su vídeo de técnica.", href: "/exercises" },
    { done: routines > 0, title: "Crea una rutina", body: "Junta ejercicios con sus series y repeticiones.", href: "/routines/new" },
    { done: programs > 0, title: "Monta un programa", body: "Rutinas repartidas por semanas.", href: "/programs" },
    {
      done: user.stripe_charges_enabled && prices > 0,
      title: "Conecta Stripe y pon tus precios",
      body: "Solo si vas a cobrar con tarjeta. Si cobras en efectivo, sáltatelo.",
      href: "/billing",
    },
    { done: clients > 0, title: "Invita a tu primer cliente", body: "Por email, eligiendo cómo te paga.", href: "/clients" },
    { done: assigned > 0, title: "Asígnale un programa", body: "Desde el programa, elige a tu cliente.", href: "/programs" },
  ];
  const done = tasks.filter((t) => t.done).length;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Header />
      <h1 className="mt-10 text-2xl font-bold">Primeros pasos</h1>
      <p className="mt-2 text-[#666]">
        {done === tasks.length ? "Ya lo tienes todo en marcha." : `${done} de ${tasks.length} hechos.`}
      </p>
      <ul className="mt-6 flex flex-col gap-2">
        {tasks.map((t) => (
          <li key={t.title}>
            <Link
              href={t.href}
              className="flex min-h-11 items-center gap-3 rounded-xl border border-[#ddd] p-3 hover:border-primary"
            >
              <span
                aria-hidden
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  t.done ? "bg-success text-white" : "border border-[#ccc]"
                }`}
              >
                {t.done ? "✓" : ""}
              </span>
              <span>
                <span className={`font-medium ${t.done ? "text-[#999] line-through" : ""}`}>{t.title}</span>
                <span className="sr-only">{t.done ? " (hecho)" : " (pendiente)"}</span>
                <span className="block text-sm text-[#666]">{t.body}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/clients" className="mt-6 inline-block text-sm text-secondary underline">
        Ir al panel
      </Link>
      <HowItWorks />
    </main>
  );
}
