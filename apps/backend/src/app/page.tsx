import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="text-5xl font-bold tracking-tight">
        True<span className="text-primary">Rep</span>
      </h1>
      <p className="mt-6 text-xl text-[#666]">
        Calisthenics training with expert routines, community challenges, and AI-powered form
        feedback. Every rep counts.
      </p>
      <div className="mt-10 flex justify-center gap-4">
        <Link
          href="/pricing"
          className="rounded-lg bg-primary px-6 py-3 font-semibold text-white"
        >
          View Pricing
        </Link>
        <Link
          href="/routines"
          className="rounded-lg border border-[#ddd] px-6 py-3 font-semibold"
        >
          Trainer Dashboard
        </Link>
      </div>
      <p className="mt-16 text-sm text-[#999]">
        iOS &amp; Android apps coming soon · <Link href="/privacy">Privacy</Link> ·{" "}
        <Link href="/terms">Terms</Link>
      </p>
    </main>
  );
}
