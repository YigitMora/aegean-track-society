import Link from "next/link";
import type { ReactNode } from "react";

type AdminShellProps = {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function AdminShell({ title, eyebrow, actions, children }: AdminShellProps) {
  return (
    <main className="min-h-screen bg-asphalt text-white">
      <header className="border-b border-white/10 bg-asphalt/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <Link href="/admin" className="text-sm font-black uppercase tracking-wide">
              Aegean Track Days Ops
            </Link>
            <p className="mt-1 text-xs font-semibold uppercase text-white/45">
              Kula MyTrack operations
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-sm font-bold">
            <Link
              href="/admin"
              className="rounded-full border border-white/15 px-4 py-2 text-white/75 transition hover:border-white hover:text-white"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/participants"
              className="rounded-full border border-white/15 px-4 py-2 text-white/75 transition hover:border-white hover:text-white"
            >
              Participants
            </Link>
            <Link
              href="/admin/members"
              className="rounded-full border border-white/15 px-4 py-2 text-white/75 transition hover:border-white hover:text-white"
            >
              Members
            </Link>
            <Link
              href="/admin/check-in"
              className="rounded-full border border-white/15 px-4 py-2 text-white/75 transition hover:border-white hover:text-white"
            >
              Check-in
            </Link>
            <Link
              href="/admin/export"
              className="rounded-full border border-white/15 px-4 py-2 text-white/75 transition hover:border-white hover:text-white"
            >
              Export CSV
            </Link>
            <form action="/admin/logout" method="post">
              <button
                type="submit"
                className="rounded-full bg-white px-4 py-2 font-black text-asphalt transition hover:bg-signal"
              >
                Logout
              </button>
            </form>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            {eyebrow ? (
              <p className="text-sm font-black uppercase text-signal">{eyebrow}</p>
            ) : null}
            <h1 className="mt-2 text-4xl font-black leading-tight sm:text-5xl">
              {title}
            </h1>
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>

        {children}
      </section>
    </main>
  );
}
