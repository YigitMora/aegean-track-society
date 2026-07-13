import Link from "next/link";
import type {
  RatingDiscoveryCta,
  RatingDiscoveryDemo,
  RatingDiscoveryDeltaRow,
} from "@/lib/rating-discovery";
import { ratingDeltaTone } from "@/lib/vehicle-rating-deltas";
import { ratingToneForScore } from "@/lib/vehicle-rating-tone";
import { clampScore } from "./rating-component-bars";
import { RatingStatusBadge } from "./rating-demo-card";

type AccountRatingDemoProps = {
  demo: RatingDiscoveryDemo;
  cta: RatingDiscoveryCta;
  className?: string;
};

const accountDemoComponentLabels = {
  power: "Güç",
  handling: "Yol Tutuş",
  braking: "Fren",
  thermal: "Termal",
} as const;

const accountDemoComponentOrder = [
  "power",
  "handling",
  "braking",
  "thermal",
] as const;

const accountRatingDemoDisclaimer =
  "ATS Rating tahmini bir karşılaştırma göstergesidir; dyno veya resmî tur zamanı değildir.";

export function AccountRatingDemo({
  demo,
  cta,
  className = "",
}: AccountRatingDemoProps) {
  const stockScore = clampScore(demo.stockRating.overall);
  const buildScore = clampScore(demo.buildRating.overall);
  const buildTone = ratingToneForScore(buildScore);
  const overallDeltaTone = ratingDeltaTone(demo.overallDelta);
  const componentRows = accountDemoComponentOrder.flatMap((key) => {
    const row = demo.deltaRows.find((candidate) => candidate.key === key);

    return row ? [row] : [];
  });
  const visibleParts = demo.parts.slice(0, 4);
  const hiddenPartCount = Math.max(0, demo.parts.length - visibleParts.length);

  return (
    <section
      data-analytics-event="account_fl5_demo_viewed"
      className={`overflow-hidden rounded-lg border bg-ats-black p-5 shadow-soft ${className}`}
      style={{
        borderColor: buildTone.border,
        background: `linear-gradient(160deg, ${buildTone.background}, rgba(8,11,15,0.96) 46%, rgba(14,18,24,0.98))`,
        boxShadow: `0 24px 70px ${buildTone.background}`,
      }}
      aria-labelledby="account-fl5-demo-title"
    >
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-ats-blue">
            {demo.sourceLabel}
          </p>
          <h2
            id="account-fl5-demo-title"
            className="mt-3 text-2xl font-black leading-tight text-ats-text"
          >
            FL5 ne kadar gelişebilir?
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-ats-muted">
            Stok rating ile gerçek parçalardan oluşan örnek Track Build
            arasındaki tahmini farkı incele.
          </p>
        </div>
        <div
          className="grid h-20 w-20 shrink-0 place-items-center rounded-full border bg-ats-surface text-center"
          style={{
            borderColor: buildTone.border,
            boxShadow: `inset 0 0 0 5px rgba(255,255,255,0.04), 0 0 30px ${buildTone.background}`,
          }}
          role="img"
          aria-label={`${demo.presentationLabel} ATS Rating ${buildScore} / 100, ${buildTone.label}`}
        >
          <div>
            <p className="text-3xl font-black leading-none text-ats-text">
              {buildScore}
            </p>
            <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-ats-muted">
              ATS
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 min-w-0 rounded-md border border-ats-border bg-ats-surface/70 p-4">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-black text-ats-text">{demo.vehicleLabel}</p>
            <p className="mt-1 text-xs font-semibold text-ats-muted">
              {demo.vehicleSubtitle} · {demo.presentationLabel}
            </p>
          </div>
          <RatingStatusBadge status={demo.buildRating.status} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <ScoreSummary label="Stok" value={stockScore} />
          <ScoreSummary label="Track Build" value={buildScore} />
          <div className="min-w-0 rounded-md border border-ats-border bg-ats-black p-3">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-ats-muted">
              Delta
            </p>
            <p
              className={`mt-2 text-2xl font-black leading-none ${
                overallDeltaTone === "positive"
                  ? "text-emerald-200"
                  : overallDeltaTone === "negative"
                    ? "text-red-100"
                    : "text-ats-text"
              }`}
              aria-label={`Genel ATS Rating değişimi ${demo.formattedOverallDelta}`}
            >
              {demo.formattedOverallDelta}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3" aria-label="Seçili ATS Rating bileşenleri">
        {componentRows.map((row) => (
          <ComponentDeltaMeter key={row.key} row={row} />
        ))}
      </div>

      {visibleParts.length > 0 ? (
        <div className="mt-5">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-ats-muted">
            Örnek parçalar
          </p>
          <ul className="mt-3 flex min-w-0 flex-wrap gap-2">
            {visibleParts.map((part) => (
              <li key={part.code} className="min-w-0">
                <span
                  className="block max-w-full truncate rounded-full border border-ats-border bg-ats-surface px-3 py-1.5 text-xs font-black text-ats-text"
                  title={`${part.label} · ${part.fitmentLabel}`}
                >
                  {part.label}
                </span>
              </li>
            ))}
            {hiddenPartCount > 0 ? (
              <li>
                <span className="block rounded-full border border-ats-blue/35 bg-ats-blue/10 px-3 py-1.5 text-xs font-black text-ats-blue">
                  +{hiddenPartCount} parça
                </span>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href={cta.href}
          data-analytics-event={cta.event}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-ats-blue px-5 py-2 text-center text-sm font-black text-ats-black transition hover:bg-ats-blue-hover focus:outline-none focus:ring-2 focus:ring-ats-blue/40 focus:ring-offset-2 focus:ring-offset-ats-black"
        >
          {cta.label}
        </Link>
        <Link
          href="/#ats-rating-how-it-works"
          data-analytics-event="account_fl5_demo_how_it_works_clicked"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-ats-border px-5 py-2 text-center text-sm font-black text-ats-text transition hover:border-ats-blue hover:text-ats-blue focus:outline-none focus:ring-2 focus:ring-ats-blue/40 focus:ring-offset-2 focus:ring-offset-ats-black"
        >
          ATS Rating nasıl çalışır?
        </Link>
      </div>

      <p className="mt-4 text-xs font-semibold leading-5 text-ats-muted">
        {accountRatingDemoDisclaimer}
      </p>
    </section>
  );
}

function ScoreSummary({ label, value }: { label: string; value: number }) {
  const tone = ratingToneForScore(value);

  return (
    <div
      className="min-w-0 rounded-md border bg-ats-black p-3"
      style={{
        borderColor: tone.border,
        background: `linear-gradient(145deg, ${tone.background}, rgba(8,11,15,0.94))`,
      }}
    >
      <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-ats-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black leading-none text-ats-text">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-ats-muted">
        /100
      </p>
    </div>
  );
}

function ComponentDeltaMeter({ row }: { row: RatingDiscoveryDeltaRow }) {
  const score = clampScore(row.build);
  const tone = ratingToneForScore(score);
  const label = accountDemoComponentLabels[row.key as keyof typeof accountDemoComponentLabels];

  if (!label) {
    return null;
  }

  return (
    <div className="min-w-0 rounded-md border border-ats-border bg-ats-surface/65 p-3">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-black text-ats-text">{label}</p>
          <p className="mt-0.5 text-[10px] font-semibold text-ats-muted">
            Stok {row.stock}
          </p>
        </div>
        <p className="shrink-0 text-xs font-black text-ats-text">
          {score}
          <span
            className={`ml-2 ${
              row.tone === "positive"
                ? "text-emerald-200"
                : row.tone === "negative"
                  ? "text-red-100"
                  : "text-ats-muted"
            }`}
            aria-label={`${label} değişimi ${row.formattedDelta}`}
          >
            {row.formattedDelta}
          </span>
        </p>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"
        role="meter"
        aria-label={`${label}: Track Build ${score} / 100, stok ${row.stock}, değişim ${row.formattedDelta}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none"
          style={{
            width: `${score}%`,
            backgroundColor: tone.color,
          }}
        />
      </div>
    </div>
  );
}
