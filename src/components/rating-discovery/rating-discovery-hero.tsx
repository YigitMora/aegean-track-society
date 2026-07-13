import Link from "next/link";
import {
  ratingDiscoveryDisclaimer,
  type RatingDiscoveryDemo,
  type RatingDiscoveryState,
} from "@/lib/rating-discovery";
import { RatingDemoCard } from "./rating-demo-card";

type RatingDiscoveryHeroProps = {
  state: RatingDiscoveryState;
  demo: RatingDiscoveryDemo | null;
  mode?: "full" | "compact";
};

export function RatingDiscoveryHero({
  state,
  demo,
  mode = "full",
}: RatingDiscoveryHeroProps) {
  const compact = mode === "compact";

  return (
    <section
      id="ats-rating-discovery"
      data-analytics-event="rating_discovery_viewed"
      className={`relative overflow-hidden rounded-lg border border-ats-border bg-ats-surface shadow-soft ${
        compact ? "p-5" : "mt-10 p-6 sm:p-8 lg:p-10"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(0,163,224,0.18),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0))]" />
      <div className="relative grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-ats-blue">
            ATS PERFORMANCE RATING
          </p>
          <h2
            className={`mt-4 font-black leading-none text-ats-text ${
              compact ? "text-3xl" : "text-4xl sm:text-6xl"
            }`}
          >
            {state.title}
          </h2>
          <p className="mt-5 max-w-2xl text-sm font-semibold leading-7 text-ats-muted sm:text-base sm:leading-8">
            {state.body}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={state.primaryCta.href}
              data-analytics-event={state.primaryCta.event}
              className="inline-flex h-12 items-center justify-center rounded-full bg-ats-blue px-6 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover focus:outline-none focus:ring-2 focus:ring-ats-blue/40"
            >
              {state.primaryCta.label}
            </Link>
            <Link
              href={state.secondaryCta.href}
              data-analytics-event={state.secondaryCta.event}
              className="inline-flex h-12 items-center justify-center rounded-full border border-ats-border px-6 text-sm font-black text-ats-text transition hover:border-ats-blue hover:text-ats-blue focus:outline-none focus:ring-2 focus:ring-ats-blue/30"
            >
              {state.secondaryCta.label}
            </Link>
          </div>
          <p className="mt-5 max-w-2xl text-xs font-semibold leading-5 text-ats-muted">
            {ratingDiscoveryDisclaimer}
          </p>
        </div>

        {demo ? (
          <RatingDemoCard
            rating={demo.buildRating}
            baseline={demo.stockRating}
            eyebrow={demo.sourceLabel}
            title={`${demo.vehicleLabel} ${demo.presentationLabel}`}
            subtitle={`${demo.vehicleSubtitle} · Stok ${demo.stockRating.overall} → Build ${demo.buildRating.overall}`}
          />
        ) : (
          <div className="rounded-lg border border-ats-border bg-ats-black p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-ats-blue">
              ATS Rating
            </p>
            <p className="mt-3 text-2xl font-black text-ats-text">
              Katalog örneği hazırlanıyor
            </p>
            <p className="mt-3 text-sm font-semibold leading-6 text-ats-muted">
              Demo görseli yalnızca aktif katalog ve rating verisi hazır olduğunda
              gösterilir.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
