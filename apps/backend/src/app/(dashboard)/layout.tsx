import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { getOrSyncUser } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Backoffice solo para trainers aprobados; el resto va a su solicitud.
  const user = await getOrSyncUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "TRAINER") redirect("/onboarding");

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-[#ddd] bg-surface p-6">
        <Link href="/" className="text-xl font-bold">
          True<span className="text-primary">Rep</span>
        </Link>
        <nav className="mt-8 flex flex-col gap-3 text-sm">
          <Link href="/onboarding">Primeros pasos</Link>
          <Link href="/exercises">Librería de ejercicios</Link>
          <Link href="/routines">Rutinas</Link>
          <Link href="/routines/new">Crear rutina</Link>
          <Link href="/programs">Programas</Link>
          <Link href="/clients">Clientes</Link>
          <Link href="/billing">Cobros</Link>
        </nav>
        <div className="mt-8">
          <UserButton />
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
