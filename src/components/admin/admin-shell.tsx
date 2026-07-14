import Link from "next/link";
import type { ReactNode } from "react";
import { adminHasCapability, getCurrentAdminActor, isOwnerAdmin } from "@/lib/admin-authorization";

type AdminShellProps = {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export async function AdminShell({ title, eyebrow, actions, children }: AdminShellProps) {
  const adminActor = await getCurrentAdminActor();
  const canReadMembers = adminHasCapability(adminActor?.role, "members.read");
  const canReadRegistrations = adminHasCapability(adminActor?.role, "registrations.read");
  const canManageCheckIn = adminHasCapability(adminActor?.role, "checkin.manage");
  const isOwner = isOwnerAdmin(adminActor?.role);
  const homeHref = isOwner ? "/admin" : canManageCheckIn ? "/admin/check-in" : "/admin/login";

  return (
    <main className="min-h-screen bg-asphalt text-white">
      <header className="border-b border-white/10 bg-asphalt/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <Link href={homeHref} className="text-sm font-black uppercase tracking-wide">
              Aegean Track Days Ops
            </Link>
            <p className="mt-1 text-xs font-semibold uppercase text-white/45">
              Kula MyTrack operations
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-sm font-bold">
            {isOwner ? (
              <Link
                href="/admin"
                className="rounded-full border border-white/15 px-4 py-2 text-white/75 transition hover:border-white hover:text-white"
              >
                Dashboard
              </Link>
            ) : null}
            {canReadRegistrations ? (
              <Link
                href="/admin/participants"
                className="rounded-full border border-white/15 px-4 py-2 text-white/75 transition hover:border-white hover:text-white"
              >
                Katılımcılar
              </Link>
            ) : null}
            {canReadMembers ? (
              <Link
                href="/admin/members"
                className="rounded-full border border-white/15 px-4 py-2 text-white/75 transition hover:border-white hover:text-white"
              >
                Üyeler
              </Link>
            ) : null}
            {isOwner ? (
              <Link
                href="/admin/catalog-requests"
                className="rounded-full border border-white/15 px-4 py-2 text-white/75 transition hover:border-white hover:text-white"
              >
                Katalog Talepleri
              </Link>
            ) : null}
            {canManageCheckIn ? (
              <Link
                href="/admin/check-in"
                className="rounded-full border border-white/15 px-4 py-2 text-white/75 transition hover:border-white hover:text-white"
              >
                Check-in
              </Link>
            ) : null}
            {isOwner ? (
              <Link
                href="/admin/export"
                className="rounded-full border border-white/15 px-4 py-2 text-white/75 transition hover:border-white hover:text-white"
              >
                Export CSV
              </Link>
            ) : null}
            {isOwner ? (
              <Link
                href="/admin/team"
                className="rounded-full border border-white/15 px-4 py-2 text-white/75 transition hover:border-white hover:text-white"
              >
                Ekip ve Yetkiler
              </Link>
            ) : null}
            <form action="/admin/logout" method="post">
              <button
                type="submit"
                className="rounded-full bg-white px-4 py-2 font-black text-asphalt transition hover:bg-signal"
              >
                Çıkış Yap
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
