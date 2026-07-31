import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export default async function RoutinesPage() {
  const { userId } = await auth();
  const trainer = userId ? await db.user.findUnique({ where: { clerk_id: userId } }) : null;

  if (!trainer || trainer.role !== "TRAINER") {
    return <p className="text-[#666]">Trainer role required to manage routines.</p>;
  }

  const routines = await db.routine.findMany({
    where: { trainer_id: trainer.id, deleted_at: null },
    orderBy: { created_at: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Routines</h1>
        <Link href="/routines/new" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
          + New Routine
        </Link>
      </div>
      <ul className="mt-6 space-y-3">
        {routines.map((r) => (
          <li key={r.id} className="rounded-lg border border-[#ddd] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{r.title}</p>
                <p className="text-sm text-[#666]">
                  {r.difficulty.toLowerCase()} · {r.duration_minutes} min ·{" "}
                  {r.is_published ? "published" : "draft"}
                </p>
              </div>
              <Link href={`/routines/${r.id}/edit`} className="text-sm text-secondary underline">
                Editar
              </Link>
            </div>
          </li>
        ))}
        {routines.length === 0 && <p className="text-[#999]">No routines yet — create your first one.</p>}
      </ul>
    </div>
  );
}
