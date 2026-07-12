import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/auth/actions";
import { requireMemberUser } from "@/lib/member-auth";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  await requireMemberUser("/account");

  return (
    <main className="min-h-screen bg-ats-black text-ats-text">
      <header className="border-b border-ats-border bg-ats-black/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-6 py-6 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="text-xs font-black uppercase tracking-[0.2em] text-ats-text transition hover:text-ats-blue"
          >
            Aegean Track Society
          </Link>
          <nav className="flex items-center gap-4 overflow-x-auto text-xs font-bold uppercase tracking-[0.16em] text-ats-muted">
            <Link href="/events/kula-mytrack-2026" className="transition hover:text-ats-blue">
              Etkinlik
            </Link>
            <Link href="/account/garage" className="transition hover:text-ats-blue">
              Garajım
            </Link>
            <Link href="/account/registrations" className="transition hover:text-ats-blue">
              Başvurularım
            </Link>
            <Link href="/account" className="transition hover:text-ats-blue">
              Hesabım
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="transition hover:text-ats-blue">
                Çıkış
              </button>
            </form>
          </nav>
        </div>
      </header>

      {children}
    </main>
  );
}
