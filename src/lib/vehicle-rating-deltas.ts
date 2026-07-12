export type RatingDeltaTone = "positive" | "neutral" | "negative";

export const ratingComponentRows = [
  ["Güç", "power"],
  ["Yol tutuş", "handling"],
  ["Fren", "braking"],
  ["Güvenilirlik", "reliability"],
  ["Termal yönetim", "thermal"],
  ["Pist hazırlığı", "trackReadiness"],
] as const;

export type RatingComponentKey = (typeof ratingComponentRows)[number][1];

export function ratingDelta(current: number, projected: number) {
  return Math.round(projected) - Math.round(current);
}

export function ratingDeltaTone(delta: number): RatingDeltaTone {
  if (delta > 0) {
    return "positive";
  }

  if (delta < 0) {
    return "negative";
  }

  return "neutral";
}

export function formatRatingDelta(delta: number) {
  if (delta > 0) {
    return `+${delta}`;
  }

  if (delta < 0) {
    return String(delta);
  }

  return "0";
}
