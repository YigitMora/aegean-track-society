import {
  type VehiclePerformanceRating,
  vehicleRatingDisclaimer,
} from "@/lib/vehicle-performance-rating";
import { ratingComponentRows } from "@/lib/vehicle-rating-deltas";
import { ratingToneForScore } from "@/lib/vehicle-rating-tone";

export { ratingToneForScore };

type VehiclePerformanceRatingCardProps = {
  rating: VehiclePerformanceRating | null;
  className?: string;
  compact?: boolean;
};

export function VehiclePerformanceRatingCard({
  rating,
  className = "",
  compact = false,
}: VehiclePerformanceRatingCardProps) {
  if (!rating) {
    return (
      <div className={`rounded-md border border-ats-border bg-ats-black p-4 ${className}`}>
        <p className="text-sm font-black text-ats-text">Rating mevcut değil</p>
        <p className="mt-2 text-xs font-semibold leading-5 text-ats-muted">
          ATS Performance Rating henüz mevcut değil. Araç platformu henüz
          doğrulanmadı.
        </p>
      </div>
    );
  }

  if (compact) {
    return <CompactRatingCard rating={rating} className={className} />;
  }

  return (
    <section
      className={`rounded-md border border-ats-border bg-ats-surface p-5 shadow-soft sm:p-6 ${className}`}
      aria-label={`ATS Performance Rating ${rating.overall} / 100`}
    >
      <div className="grid gap-6 md:grid-cols-[180px_1fr] md:items-center">
        <div className="flex justify-center md:justify-start">
          <OverallGauge rating={rating} size={168} strokeWidth={13} />
        </div>
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-ats-blue">
                ATS Performance Rating
              </p>
              <h3 className="mt-2 text-2xl font-black text-ats-text">
                Performans profili
              </h3>
            </div>
            <RatingStatusBadge status={rating.status} />
          </div>
          <RatingBars rating={rating} className="mt-5" />
        </div>
      </div>
      <p className="mt-5 border-t border-ats-border pt-4 text-xs font-semibold leading-5 text-ats-muted">
        {vehicleRatingDisclaimer}
      </p>
    </section>
  );
}

export const VehicleRatingCard = VehiclePerformanceRatingCard;

function CompactRatingCard({
  rating,
  className,
}: {
  rating: VehiclePerformanceRating;
  className: string;
}) {
  const tone = ratingToneForScore(rating.overall);

  return (
    <section
      className={`rounded-md border bg-ats-black p-4 ${className}`}
      style={{
        borderColor: tone.border,
        background: `linear-gradient(135deg, ${tone.background}, rgba(10,10,14,0.92))`,
      }}
      aria-label={`ATS Performance Rating ${rating.overall} / 100`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-ats-muted">
            ATS Rating
          </p>
          <p className="mt-1 text-3xl font-black leading-none text-ats-text">
            {rating.overall}
          </p>
        </div>
        <RatingStatusBadge status={rating.status} />
      </div>
      <RatingBars rating={rating} className="mt-4" compact />
      <p className="mt-4 text-xs font-semibold leading-5 text-ats-muted">
        {vehicleRatingDisclaimer}
      </p>
    </section>
  );
}

function OverallGauge({
  rating,
  size,
  strokeWidth,
}: {
  rating: VehiclePerformanceRating;
  size: number;
  strokeWidth: number;
}) {
  const tone = ratingToneForScore(rating.overall);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampScore(rating.overall) / 100) * circumference;

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Genel ATS rating ${rating.overall} / 100, ${tone.label}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-5xl font-black leading-none text-ats-text">
            {rating.overall}
          </p>
          <p className="mt-2 text-[11px] font-black uppercase tracking-[0.18em] text-ats-muted">
            ATS Rating
          </p>
        </div>
      </div>
    </div>
  );
}

function RatingBars({
  rating,
  className = "",
  compact = false,
}: {
  rating: VehiclePerformanceRating;
  className?: string;
  compact?: boolean;
}) {
  return (
    <dl className={`grid gap-3 ${className}`}>
      {ratingComponentRows.map(([label, key]) => {
        const score = clampScore(rating[key]);
        const tone = ratingToneForScore(score);

        return (
          <div key={key} className={compact ? "" : "rounded border border-ats-border bg-ats-black p-3"}>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-xs font-black uppercase tracking-[0.12em] text-ats-muted">
                {label}
              </dt>
              <dd className="text-sm font-black text-ats-text">{score}</dd>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
              aria-label={`${label}: ${score} / 100`}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${score}%`,
                  backgroundColor: tone.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </dl>
  );
}

function RatingStatusBadge({ status }: { status: VehiclePerformanceRating["status"] }) {
  const isCalibrated = status === "CALIBRATED";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${
        isCalibrated
          ? "border-ats-blue/40 bg-ats-blue/10 text-ats-blue"
          : "border-ats-border bg-ats-black text-ats-muted"
      }`}
    >
      {isCalibrated ? "Kalibre edildi" : "Geçici kalibrasyon"}
    </span>
  );
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}
