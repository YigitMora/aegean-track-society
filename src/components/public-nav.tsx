import Link from "next/link";
import { MemberNavLinks } from "@/components/member-nav-links";

const eventHref = "/events/kula-mytrack-2026";
const registerHref = "/events/kula-mytrack-2026/register";

type PublicNavProps = {
  homeAnchors?: boolean;
};

function publicNavItems(homeAnchors: boolean) {
  return [
    { label: "Etkinlik", href: eventHref },
    { label: "Program", href: homeAnchors ? "#program" : `${eventHref}#program` },
    { label: "Galeri", href: homeAnchors ? "#galeri" : `${eventHref}#galeri` },
    { label: "SSS", href: `${eventHref}#sss` },
    { label: "Kayıt", href: registerHref },
  ];
}

export function PublicNav({ homeAnchors = false }: PublicNavProps) {
  const navItems = publicNavItems(homeAnchors);

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-5 px-6 py-6 sm:px-8 lg:px-10">
      <Link href="/" className="text-sm font-black uppercase tracking-[0.18em] text-ats-text">
        Aegean Track Society
      </Link>
      <nav className="flex max-w-[58vw] items-center gap-4 overflow-x-auto text-xs font-bold uppercase tracking-[0.14em] text-ats-muted sm:max-w-none sm:gap-6">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap transition hover:text-ats-blue"
          >
            {item.label}
          </Link>
        ))}
        <span className="h-4 w-px shrink-0 bg-ats-border" />
        <MemberNavLinks />
      </nav>
    </header>
  );
}
