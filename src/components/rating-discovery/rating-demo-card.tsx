import type { VehiclePerformanceRating } from "@/lib/vehicle-performance-rating";
import { ratingToneForScore } from "@/lib/vehicle-rating-tone";
import { RatingComponentBars, clampScore } from "./rating-component-bars";

type RatingDemoCardProps = {
  rating: VehiclePerformanceRating;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  sourceLabel?: string;
  baseline?: VehiclePerformanceRating | null;
  compact?: boolean;
};

export function RatingDemoCard({
  rating,
  eyebrow = "ATS Rating",
  title,
  subtitle,
  sourceLabel,
  baseline = null,
  compact = false,
}: RatingDemoCardProps) {
  const tone = ratingToneForScore(rating.overall);

  return (
    <section
      className={`rounded-lg border p-4 shadow-soft ${
        compact ? "bg-ats-black/80" : "bg-ats-black/75 sm:p-5"
      }`}
      style={{
        borderColor: tone.border,
        background: `linear-gradient(145deg, ${tone.background}, rgba(8,11,15,0.94))`,
        boxShadow: `0 20px 70px ${tone.background}`,
      }}
      aria-label={`ATS Rating ${clampScore(rating.overall)} / 100`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex justify-center sm:block">
          <OverallRing rating={rating} size={compact ? 128 : 154} strokeWidth={11} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-ats-blue">
                {eyebrow}
              </p>
              <h3 className="mt-2 text-2xl font-black leading-tight text-ats-text">
                {title}
              </h3>
              {subtitle ? (
                <p className="mt-1 text-sm font-semibold text-ats-muted">
                  {subtitle}
                </p>
              ) : null}
            </div>
            <RatingStatusBadge status={rating.status} />
          </div>
          {sourceLabel ? (
            <p className="mt-3 inline-flex rounded-full border border-ats-blue/35 bg-ats-blue/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-ats-blue">
              {sourceLabel}
            </p>
          ) : null}
        </div>
      </div>

      <RatingComponentBars
        rating={rating}
        baseline={baseline}
        compact={compact}
        className="mt-5"
      />
    </section>
  );
}

export function RatingStatusBadge({
  status,
}: {
  status: VehiclePerformanceRating["status"];
}) {
  const isCalibrated = status === "CALIBRATED";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
        isCalibrated
          ? "border-ats-blue/40 bg-ats-blue/10 text-ats-blue"
          : "border-ats-border bg-ats-black text-ats-muted"
      }`}
    >
      {isCalibrated ? "Kalibre" : "Provisional"}
    </span>
  );
}

function OverallRing({
  rating,
  size,
  strokeWidth,
}: {
  rating: VehiclePerformanceRating;
  size: number;
  strokeWidth: number;
}) {
  const score = clampScore(rating.overall);
  const tone = ratingToneForScore(score);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Genel ATS Rating ${score} / 100, ${tone.label}`}
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
          stroke="rgba(255,255,255,0.08)"
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
          className="transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-4xl font-black leading-none text-ats-text">{score}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-ats-muted">
            /100
          </p>
        </div>
      </div>
    </div>
  );
}
