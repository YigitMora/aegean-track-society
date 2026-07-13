import type { VehiclePerformanceRating } from "@/lib/vehicle-performance-rating";
import {
  formatRatingDelta,
  ratingComponentRows,
  ratingDelta,
  ratingDeltaTone,
} from "@/lib/vehicle-rating-deltas";
import { ratingToneForScore } from "@/lib/vehicle-rating-tone";

type RatingComponentBarsProps = {
  rating: VehiclePerformanceRating;
  baseline?: VehiclePerformanceRating | null;
  compact?: boolean;
  className?: string;
};

export function RatingComponentBars({
  rating,
  baseline = null,
  compact = false,
  className = "",
}: RatingComponentBarsProps) {
  return (
    <dl
      className={`grid ${compact ? "gap-2" : "gap-3"} ${className}`}
      aria-label="ATS Rating bileşenleri"
    >
      {ratingComponentRows.map(([label, key]) => {
        const score = clampScore(rating[key]);
        const tone = ratingToneForScore(score);
        const delta = baseline ? ratingDelta(baseline[key], rating[key]) : null;
        const deltaTone = delta === null ? null : ratingDeltaTone(delta);

        return (
          <div key={key} className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <dt
                className={`min-w-0 font-black uppercase text-ats-muted ${
                  compact
                    ? "text-[10px] tracking-[0.1em]"
                    : "text-[11px] tracking-[0.12em]"
                }`}
              >
                {label}
              </dt>
              <dd className="flex shrink-0 items-center gap-2 text-xs font-black text-ats-text">
                <span>{score}</span>
                {delta !== null ? (
                  <span
                    className={
                      deltaTone === "positive"
                        ? "text-emerald-200"
                        : deltaTone === "negative"
                          ? "text-red-100"
                          : "text-ats-muted"
                    }
                    aria-label={`${label} değişimi ${formatRatingDelta(delta)}`}
                  >
                    {formatRatingDelta(delta)}
                  </span>
                ) : null}
              </dd>
            </div>
            <div
              className={`mt-1.5 overflow-hidden rounded-full bg-white/10 ${
                compact ? "h-1.5" : "h-2"
              }`}
              role="meter"
              aria-label={`${label}: ${score} / 100`}
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
      })}
    </dl>
  );
}

export function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}
