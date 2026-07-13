import {
  ratingDiscoveryDisclaimer,
  type RatingDiscoveryDemo,
} from "@/lib/rating-discovery";
import { ratingDeltaTone } from "@/lib/vehicle-rating-deltas";
import { RatingComponentBars } from "./rating-component-bars";
import { RatingDemoCard } from "./rating-demo-card";

type BuildImpactDemoProps = {
  demo: RatingDiscoveryDemo | null;
};

export function BuildImpactDemo({ demo }: BuildImpactDemoProps) {
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
        <div className="relative min-h-[320px] overflow-hidden bg-ats-black p-6 sm:p-8">
          {/* Future user-provided asset slot: public/images/rating-demo/focus-rs-mk3.webp */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(0,163,224,0.24),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))]" />
          <div
            className="absolute inset-x-8 bottom-16 h-24 rounded-[50%] border border-ats-blue/30 bg-ats-blue/10 blur-sm"
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-8 bottom-24 h-20 rounded-t-[80px] border border-white/15 bg-white/10"
            role="img"
            aria-label="Ford Focus RS Mk3 için koyu zeminli araç görsel alanı"
          />
          <div className="relative z-10 max-w-md">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-ats-blue">
              {demo.sourceLabel}
            </p>
            <h2 className="mt-4 text-4xl font-black leading-none text-ats-text sm:text-5xl">
              {demo.vehicleLabel}
            </h2>
            <p className="mt-3 text-sm font-black uppercase tracking-[0.14em] text-ats-muted">
              {demo.vehicleSubtitle} · {demo.presentationLabel}
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-ats-blue">
                Stok vs Track Build
              </p>
              <h3 className="mt-3 text-3xl font-black text-ats-text">
                Rating değişimini gör
              </h3>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-ats-muted">
                ATS Rating yalnızca beygir gücünü ölçmez. Build'in; fren, termal
                dayanıklılık, yol tutuş, güvenilirlik ve pist hazırlığı birlikte
                değerlendirilir.
              </p>
            </div>
            <div className="rounded-md border border-ats-border bg-ats-black px-4 py-3">
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
