import {
  ratingDiscoveryDisclaimer,
  type StockRatingLeaderboardEntry,
  type RatingDiscoveryDemo,
} from "@/lib/rating-discovery";
import { ratingDeltaTone } from "@/lib/vehicle-rating-deltas";
import { ratingToneForScore } from "@/lib/vehicle-rating-tone";
import { RatingComponentBars } from "./rating-component-bars";
import { RatingDemoCard, RatingStatusBadge } from "./rating-demo-card";

type BuildImpactDemoProps = {
  demo: RatingDiscoveryDemo | null;
  stockTopTen: StockRatingLeaderboardEntry[];
};

export function BuildImpactDemo({ demo, stockTopTen }: BuildImpactDemoProps) {
  if (!demo) {
    return null;
  }

  const overallTone = ratingDeltaTone(demo.overallDelta);

  return (
    <section
      id="focus-rs-demo"
      data-analytics-event="rating_discovery_demo_viewed"
      className="mt-8 overflow-hidden rounded-lg border border-ats-border bg-ats-surface shadow-soft"
    >
      <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="order-2 bg-ats-black p-4 sm:p-6 lg:order-1 lg:p-7">
          <StockTopTenLeaderboard entries={stockTopTen} />
        </div>

        <div className="order-1 p-6 sm:p-8 lg:order-2">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-ats-blue">
            ATS PERFORMANCE INDEX
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight text-ats-text sm:text-4xl">
            Stock performansı gör. Build potansiyelini keşfet.
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-ats-muted">
            Veritabanındaki en yüksek stock ATS Rating değerlerini incele; ardından
            gerçek parçalarla bir build'in nasıl değişebildiğini Focus RS örneğinde
            gör.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="mt-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-ats-blue">
                Stok vs Track Build
              </p>
              <h3 className="mt-3 text-2xl font-black text-ats-text">
                {demo.vehicleLabel}
              </h3>
              <p className="mt-1 text-sm font-black uppercase tracking-[0.14em] text-ats-muted">
                {demo.vehicleSubtitle} · {demo.presentationLabel}
              </p>
            </div>
            <div className="rounded-md border border-ats-border bg-ats-black px-4 py-3 sm:mt-6">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-ats-muted">
                Genel değişim
              </p>
              <p
                className={`mt-1 text-2xl font-black ${
                  overallTone === "positive"
                    ? "text-emerald-200"
                    : overallTone === "negative"
                      ? "text-red-100"
                      : "text-ats-text"
                }`}
              >
                {demo.formattedOverallDelta}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <RatingDemoCard
              rating={demo.stockRating}
              title="Stok"
              subtitle={`Base ATS Rating ${demo.stockRating.overall}`}
              compact
            />
            <RatingDemoCard
              rating={demo.buildRating}
              baseline={demo.stockRating}
              title={demo.presentationLabel}
              subtitle={`Projected ATS Rating ${demo.buildRating.overall}`}
              sourceLabel={demo.sourceLabel}
              compact
            />
          </div>

          <div className="mt-6 rounded-md border border-ats-border bg-ats-black p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-ats-muted">
              Bileşen değişimleri
            </p>
            <RatingComponentBars
              rating={demo.buildRating}
              baseline={demo.stockRating}
              compact
              className="mt-4 sm:grid-cols-2"
            />
          </div>

          <div className="mt-6 rounded-md border border-ats-border bg-ats-black p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-ats-muted">
              Demo parçaları
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {demo.parts.map((part) => (
                <li
                  key={part.code}
                  className="rounded-md border border-ats-border bg-ats-surface p-3"
                >
                  <p className="text-sm font-black text-ats-text">{part.label}</p>
                  <p className="mt-1 text-xs font-semibold text-ats-muted">
                    {part.categoryLabel} · {part.fitmentLabel}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-5 text-xs font-semibold leading-5 text-ats-muted">
            {ratingDiscoveryDisclaimer}
          </p>
        </div>
      </div>
    </section>
  );
}

function StockTopTenLeaderboard({
  entries,
}: {
  entries: StockRatingLeaderboardEntry[];
}) {
  if (entries.length === 0) {
    return (
      <section className="rounded-lg border border-ats-border bg-ats-surface p-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-ats-blue">
          Stock ATS Rating Top 10
        </p>
        <p className="mt-3 text-sm font-semibold leading-6 text-ats-muted">
          Aktif katalogda gösterilecek yeterli stock rating verisi bulunamadı.
        </p>
      </section>
    );
  }

  return (
    <section
      className="h-full rounded-lg border border-white/10 bg-[linear-gradient(145deg,rgba(14,20,28,0.98),rgba(8,11,15,0.96))] p-4 shadow-soft sm:p-5"
      aria-labelledby="stock-rating-top-ten-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-ats-blue">
            Live catalog
          </p>
          <h3
            id="stock-rating-top-ten-title"
            className="mt-2 text-2xl font-black leading-tight text-ats-text"
          >
            Stock ATS Rating Top 10
          </h3>
        </div>
        <a
          href="/account/garage/new"
          data-analytics-event="rating_discovery_add_vehicle_clicked"
          className="inline-flex w-fit rounded-md border border-ats-blue/35 bg-ats-blue/10 px-3 py-2 text-xs font-black text-ats-blue transition hover:border-ats-blue hover:bg-ats-blue/15 focus:outline-none focus:ring-2 focus:ring-ats-blue focus:ring-offset-2 focus:ring-offset-ats-black"
        >
          Aracımın Ratingini Keşfet
        </a>
      </div>

      <p className="mt-3 text-xs font-semibold leading-5 text-ats-muted">
        Liste, aktif katalog araçlarının modifikasyonsuz ATS Overall değerlerine
        göre oluşturulur.
      </p>

      <ol className="mt-5 grid gap-2">
        {entries.map((entry) => (
          <StockTopTenRow key={entry.code} entry={entry} />
        ))}
      </ol>
    </section>
  );
}

function StockTopTenRow({ entry }: { entry: StockRatingLeaderboardEntry }) {
  const tone = ratingToneForScore(entry.overall);
  const isPodium = entry.rank <= 3;

  return (
    <li
      className={`grid min-w-0 grid-cols-[2.25rem_1fr_auto] items-center gap-3 rounded-md border p-3 transition-colors hover:bg-white/[0.04] ${
        isPodium ? "bg-white/[0.035]" : "bg-ats-surface/70"
      }`}
      style={{
        borderColor: isPodium ? tone.border : "rgba(255,255,255,0.10)",
      }}
    >
      <span
        className="text-sm font-black tabular-nums"
        style={{ color: isPodium ? tone.color : "rgba(255,255,255,0.56)" }}
        aria-label={`${entry.rank}. sıra`}
      >
        {String(entry.rank).padStart(2, "0")}
      </span>

      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-0 truncate text-sm font-black text-ats-text">
            {entry.brand} {entry.model}
          </p>
          <RatingStatusBadge status={entry.status} />
        </div>
        {entry.subtitle ? (
          <p className="mt-1 truncate text-xs font-semibold text-ats-muted">
            {entry.subtitle}
          </p>
        ) : null}
        <p className="mt-1 text-[11px] font-black uppercase tracking-[0.08em] text-ats-muted">
          {entry.strongestComponents
            .map((component) => `${component.label} ${component.value}`)
            .join(" · ")}
        </p>
      </div>

      <div className="text-right">
        <div
          className="rounded-md border px-2.5 py-2"
          style={{
            borderColor: tone.border,
            background: tone.background,
          }}
          aria-label={`ATS ${entry.overall}, ${entry.tierLabel}`}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-ats-muted">
            ATS
          </p>
          <p
            className="text-xl font-black leading-none tabular-nums"
            style={{ color: tone.color }}
          >
            {entry.overall}
          </p>
        </div>
      </div>
    </li>
  );
}
