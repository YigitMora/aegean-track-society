import {
  type VehiclePerformanceRating,
  vehicleRatingDisclaimer,
} from "@/lib/vehicle-performance-rating";

type VehicleRatingCardProps = {
  rating: VehiclePerformanceRating | null;
  className?: string;
  compact?: boolean;
};

const componentLabels = [
  ["Power", "power"],
  ["Handling", "handling"],
  ["Braking", "braking"],
  ["Reliability", "reliability"],
  ["Thermal", "thermal"],
  ["Track readiness", "trackReadiness"],
] as const;

export function VehicleRatingCard({
  rating,
  className = "",
  compact = false,
}: VehicleRatingCardProps) {
  if (!rating) {
    return (
      <div className={`rounded-md border border-ats-border bg-ats-black p-4 ${className}`}>
        <p className="text-sm font-black text-ats-text">
          ATS Performance Rating henüz mevcut değil.
        </p>
        <p className="mt-2 text-xs font-semibold leading-5 text-ats-muted">
          Araç platformu henüz doğrulanmadı.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-md border border-ats-blue/30 bg-ats-blue/10 p-4 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-ats-blue">
            ATS Performance Rating
          </p>
          <p className="mt-2 text-4xl font-black leading-none text-ats-text">
            {rating.overall}
          </p>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-ats-muted">
            Overall
          </p>
        </div>
        <RatingStatusBadge status={rating.status} />
      </div>

      <dl className={`mt-4 grid gap-2 ${compact ? "grid-cols-2" : "sm:grid-cols-3"}`}>
        {componentLabels.map(([label, key]) => (
          <div key={key} className="rounded border border-ats-border bg-ats-black px-3 py-2">
            <dt className="text-[11px] font-black uppercase tracking-[0.12em] text-ats-muted">
              {label}
            </dt>
            <dd className="mt-1 text-lg font-black text-ats-text">{rating[key]}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-xs font-semibold leading-5 text-ats-muted">
        {vehicleRatingDisclaimer}
      </p>
    </div>
  );
}

function RatingStatusBadge({ status }: { status: VehiclePerformanceRating["status"] }) {
  const label = status === "CALIBRATED" ? "Kalibre" : "Geçici kalibrasyon";

  return (
    <span className="inline-flex rounded-full border border-ats-blue/40 bg-ats-black px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-ats-blue">
      {label}
    </span>
  );
}
