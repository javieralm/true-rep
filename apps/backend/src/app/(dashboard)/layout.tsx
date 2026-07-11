import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-[#ddd] bg-surface p-6">
        <Link href="/" className="text-xl font-bold">
          True<span className="text-primary">Rep</span>
        </Link>
        <nav className="mt-8 flex flex-col gap-3 text-sm">
          <Link href="/routines">My Routines</Link>
          <Link href="/routines/new">Create Routine</Link>
        </nav>
        <div className="mt-8">
          <UserButton />
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
