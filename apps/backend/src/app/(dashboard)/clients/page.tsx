"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/client-api";

type ClientRow = {
  assignment_id: string;
  user: { id: string; username: string; email: string; streak: number };
  program: { id: string; name: string };
  start_date: string;
  current_week: number;
  completed_workouts: number;
  total_items: number;
  completion_percent: number;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiFetch<ClientRow[]>("/clients")
      .then(setClients)
      .finally(() => setLoaded(true));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold">Clientes</h1>
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#ddd] text-xs uppercase text-[#666]">
            <th className="py-2">Cliente</th>
            <th>Programa</th>
            <th>Semana</th>
            <th>Racha</th>
            <th>Progreso</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.assignment_id} className="border-b border-[#eee]">
              <td className="py-3">
                <p className="font-medium">{c.user.username}</p>
                <p className="text-xs text-[#999]">{c.user.email}</p>
              </td>
              <td>{c.program.name}</td>
              <td>{c.current_week === 0 ? "Empieza pronto" : `Semana ${c.current_week}`}</td>
              <td>🔥 {c.user.streak}</td>
              <td>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-[#eee]">
                    <div className="h-full bg-success" style={{ width: `${c.completion_percent}%` }} />
                  </div>
                  <span className="text-xs text-[#666]">
                    {c.completed_workouts}/{c.total_items}
                  </span>
                </div>
              </td>
              <td>
                <Link href={`/clients/${c.user.id}`} className="text-secondary underline">
                  Ver seguimiento
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {loaded && clients.length === 0 && (
        <p className="mt-4 text-sm text-[#999]">
          Aún no tienes clientes. Asigna un programa a un miembro Premium desde la página del programa.
        </p>
      )}
    </div>
  );
}
