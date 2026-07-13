import type { RatingDiscoveryCatalogShowcase } from "@/lib/rating-discovery";

type RealPartsCloudProps = {
  catalog: RatingDiscoveryCatalogShowcase;
};

export function RealPartsCloud({ catalog }: RealPartsCloudProps) {
  const chips = [...catalog.categoryChips, ...catalog.brandChips];

  return (
    <section className="mt-8 rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-ats-blue">
            ATS katalog
          </p>
          <h2 className="mt-3 text-3xl font-black text-ats-text">
            Gerçek parçalar. Gerçek build profili.
          </h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-ats-muted">
            Jant, lastik, fren, süspansiyon, turbo, ECU, soğutma ve diğer
            modifikasyonlarını ATS kataloğundan seçerek aracının build profilini
            oluştur.
          </p>
        </div>

        {chips.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-ats-border bg-ats-black px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-ats-text transition hover:border-ats-blue/60 hover:text-ats-blue motion-reduce:transition-none"
              >
                {chip}
              </span>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-ats-border bg-ats-black p-4 text-sm font-semibold text-ats-muted">
            Aktif katalog parçaları yüklendiğinde kategori ve marka etiketleri burada
            görünür.
          </p>
        )}
      </div>
    </section>
  );
}
