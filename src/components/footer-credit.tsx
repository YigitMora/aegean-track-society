export function FooterCredit() {
  return (
    <footer className="border-t border-ats-border bg-ats-black px-6 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-6xl gap-8 text-sm text-ats-muted md:grid-cols-[1.2fr_0.8fr] md:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-ats-text">
            Aegean Track Society
          </p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
            <a href="mailto:societyaegean@gmail.com" className="transition hover:text-ats-blue">
              societyaegean@gmail.com
            </a>
            <span className="text-ats-muted">Instagram: yakında</span>
          </div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ats-muted md:text-right">
          Proudly developed by <span className="text-ats-text">MORA Engineering</span>
        </p>
      </div>
    </footer>
  );
}
