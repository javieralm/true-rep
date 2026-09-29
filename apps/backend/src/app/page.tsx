import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="text-5xl font-bold tracking-tight">
        True<span className="text-primary">Rep</span>
      </h1>
      <p className="mt-6 text-xl text-[#666]">
        La plataforma para entrenadores de calistenia: programas, progreso y cobros de tus clientes en un solo sitio.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Link href="/sign-up" className="rounded-lg bg-primary px-6 py-3 font-semibold text-white">
          Soy entrenador
        </Link>
        <Link href="/sign-in" className="rounded-lg border border-[#ddd] px-6 py-3 font-semibold">
          Ya tengo cuenta
        </Link>
      </div>
      <p className="mt-16 text-sm text-[#666]">
        ¿Eres cliente? Descarga la app de TrueRep y entra con el email con el que te invitó tu entrenador.
      </p>
    </main>
  );
}
