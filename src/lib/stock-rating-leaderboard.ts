import type { VehiclePerformanceRating } from "@/lib/vehicle-performance-rating";
import {
  ratingComponentRows,
  type RatingComponentKey,
} from "@/lib/vehicle-rating-deltas";
import { ratingToneForScore } from "@/lib/vehicle-rating-tone";

export type StockRatingLeaderboardSignal = {
  key: RatingComponentKey;
  label: string;
  value: number;
};

export type StockRatingLeaderboardEntry = {
  rank: number;
  code: string;
  brand: string;
  model: string;
  subtitle: string;
  overall: number;
  status: VehiclePerformanceRating["status"];
  tierLabel: string;
  strongestComponents: StockRatingLeaderboardSignal[];
};

export type StockRatingLeaderboardCandidate = {
  vehicleDefinition: {
    code: string;
    brand: string;
    model: string;
    generation: string | null;
    variant: string | null;
    yearFrom: number | null;
    yearTo: number | null;
  };
  rating: VehiclePerformanceRating;
};

export function buildStockRatingLeaderboard(
  candidates: readonly StockRatingLeaderboardCandidate[],
  limit: number,
): StockRatingLeaderboardEntry[] {
  const safeLimit = Number.isInteger(limit)
    ? Math.max(0, Math.min(limit, 100))
    : 0;

  return [...candidates]
    .sort(
      (first, second) =>
        second.rating.overall - first.rating.overall ||
        second.rating.trackReadiness - first.rating.trackReadiness ||
        second.rating.handling - first.rating.handling ||
        first.vehicleDefinition.code.localeCompare(
          second.vehicleDefinition.code,
        ),
    )
    .slice(0, safeLimit)
    .map(({ vehicleDefinition, rating }, index) => ({
      rank: index + 1,
      code: vehicleDefinition.code,
      brand: vehicleDefinition.brand,
      model: vehicleDefinition.model,
      subtitle: formatStockLeaderboardSubtitle(vehicleDefinition),
      overall: rating.overall,
      status: rating.status,
      tierLabel: ratingToneForScore(rating.overall).label,
      strongestComponents: strongestStockRatingComponents(rating),
    }));
}

function formatStockLeaderboardSubtitle(
  vehicleDefinition: StockRatingLeaderboardCandidate["vehicleDefinition"],
) {
  return [
    vehicleDefinition.generation,
    vehicleDefinition.variant,
    formatYearRange(vehicleDefinition.yearFrom, vehicleDefinition.yearTo),
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatYearRange(yearFrom: number | null, yearTo: number | null) {
  if (!yearFrom && !yearTo) {
    return null;
  }

  if (yearFrom && yearTo) {
    return `${yearFrom}-${yearTo}`;
  }

  if (yearFrom) {
    return `${yearFrom}+`;
  }

  return `-${yearTo}`;
}

function strongestStockRatingComponents(
  rating: VehiclePerformanceRating,
): StockRatingLeaderboardSignal[] {
  return ratingComponentRows
    .map(([label, key]) => ({
      key,
      label,
      value: Math.round(rating[key]),
    }))
    .sort(
      (first, second) =>
        second.value - first.value || first.label.localeCompare(second.label),
    )
    .slice(0, 2);
}
