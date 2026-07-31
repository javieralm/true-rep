"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client-api";
import type { Program } from "@truerep/shared";

type ProgramRow = Program & { _count: { items: number; assignments: number } };

export default function ProgramsPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<ProgramRow[]>("/programs").then(setPrograms).catch(() => {});
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const program = await apiFetch<Program>("/programs", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      router.push(`/programs/${program.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  async function remove(p: ProgramRow) {
    if (!confirm(`¿Eliminar el programa "${p.name}"?`)) return;
    await apiFetch(`/programs/${p.id}`, { method: "DELETE" });
    setPrograms((ps) => ps.filter((x) => x.id !== p.id));
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Programas</h1>
        <button onClick={() => setCreating(true)} className="rounded-lg bg-primary px-4 py-2 font-semibold text-white">
          + Nuevo programa
        </button>
      </div>

      {creating && (
        <form onSubmit={create} className="mt-4 flex max-w-md gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del programa *"
            required
            minLength={2}
            autoFocus
            className="flex-1 rounded-lg border border-[#ddd] p-2.5"
          />
          <button className="rounded-lg bg-primary px-4 font-semibold text-white">Crear</button>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <ul className="mt-6 space-y-3">
        {programs.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded-lg border border-[#ddd] p-4">
            <div>
              <Link href={`/programs/${p.id}`} className="font-semibold hover:text-primary">
                {p.name}
              </Link>
              <p className="text-sm text-[#666]">
                {p._count.items} sesiones planificadas · {p._count.assignments} clientes activos
              </p>
            </div>
            <div className="flex gap-3 text-sm">
              <Link href={`/programs/${p.id}`} className="text-secondary underline">
                Editar
              </Link>
              <button onClick={() => remove(p)} className="text-danger underline">
                Eliminar
              </button>
            </div>
          </li>
        ))}
        {programs.length === 0 && !creating && (
          <p className="text-sm text-[#999]">Aún no hay programas. Crea el primero.</p>
        )}
      </ul>
    </div>
  );
}
