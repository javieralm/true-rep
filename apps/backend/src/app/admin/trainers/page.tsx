"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";

type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: "USER" | "TRAINER";
  is_superadmin: boolean;
};

export default function AdminTrainersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
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

  async function setRole(u: AdminUser, role: "USER" | "TRAINER") {
    setBusy(u.id);
    try {
      await apiFetch(`/admin/trainers/${u.id}`, { method: "PATCH", body: JSON.stringify({ role }) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
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
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold">Administración de trainers</h1>
      <p className="mt-2 text-sm text-[#666]">
        Promueve usuarios a trainer para darles acceso al backoffice.
      </p>
      <table className="mt-8 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#ddd] text-xs uppercase text-[#666]">
            <th className="py-2">Usuario</th>
            <th>Rol</th>
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
                <span className={u.role === "TRAINER" ? "font-semibold text-primary" : "text-[#666]"}>
                  {u.role}
                </span>
                {u.is_superadmin && <span className="ml-2 text-xs text-secondary">admin</span>}
              </td>
              <td className="text-right">
                {u.is_superadmin ? (
                  <span className="text-xs text-[#999]">—</span>
                ) : u.role === "TRAINER" ? (
                  <button
                    disabled={busy === u.id}
                    onClick={() => setRole(u, "USER")}
                    className="text-danger underline disabled:opacity-50"
                  >
                    Quitar trainer
                  </button>
                ) : (
                  <button
                    disabled={busy === u.id}
                    onClick={() => setRole(u, "TRAINER")}
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
