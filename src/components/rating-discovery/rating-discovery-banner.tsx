import Link from "next/link";
import {
  ratingDiscoveryDisclaimer,
  type RatingDiscoveryBannerData,
} from "@/lib/rating-discovery";

type RatingDiscoveryBannerProps = {
  data: RatingDiscoveryBannerData;
  className?: string;
};

export function RatingDiscoveryBanner({
  data,
  className = "",
}: RatingDiscoveryBannerProps) {
  return (
    <section
      data-analytics-event="rating_discovery_viewed"
      className={`overflow-hidden rounded-lg border border-ats-border bg-ats-surface p-5 shadow-soft ${className}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-ats-blue">
            ATS RATING
          </p>
          <h2 className="mt-2 text-2xl font-black text-ats-text">{data.title}</h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-ats-muted">
            {data.body}
          </p>
          <p className="mt-2 max-w-3xl text-xs font-semibold leading-5 text-ats-muted">
            {ratingDiscoveryDisclaimer}
          </p>
        </div>
        <Link
          href={data.cta.href}
          data-analytics-event={data.cta.event}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-ats-blue px-5 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover focus:outline-none focus:ring-2 focus:ring-ats-blue/40"
        >
          {data.cta.label}
        </Link>
      </div>
    </section>
  );
}
