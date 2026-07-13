const ratingDiscoverySteps = [
  {
    title: "Aracını seç",
    copy: "ATS kataloğundaki doğru marka, model, nesil ve varyantla eşleştir.",
  },
  {
    title: "Gerçek parçalarını ekle",
    copy: "Aracında kullandığın modifikasyonları kategori kategori build profiline işle.",
  },
  {
    title: "Rating değişimini gör",
    copy: "Kaydetmeden önce projected impact ile tahmini değişimi incele.",
  },
] as const;

export function RatingDiscoverySteps() {
  return (
    <section
      id="ats-rating-how-it-works"
      className="mt-8 rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft sm:p-8"
    >
      <p className="text-xs font-black uppercase tracking-[0.18em] text-ats-blue">
        Nasıl çalışır?
      </p>
      <h2 className="mt-3 text-3xl font-black text-ats-text">
        Build profilini üç adımda oluştur
      </h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {ratingDiscoverySteps.map((step, index) => (
          <article
            key={step.title}
            className="rounded-md border border-ats-border bg-ats-black p-5 transition hover:-translate-y-0.5 hover:border-ats-blue/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ats-blue/40 bg-ats-blue/10 text-sm font-black text-ats-blue">
              {index + 1}
            </span>
            <h3 className="mt-4 text-xl font-black text-ats-text">{step.title}</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-ats-muted">
              {step.copy}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
