export function ratingToneForScore(score: number) {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  if (clampedScore <= 39) {
    return {
      color: "#f87171",
      background: "rgba(248,113,113,0.16)",
      border: "rgba(248,113,113,0.32)",
      label: "Düşük",
    };
  }

  if (clampedScore <= 59) {
    return {
      color: "#fb923c",
      background: "rgba(251,146,60,0.16)",
      border: "rgba(251,146,60,0.34)",
      label: "Orta",
    };
  }

  if (clampedScore <= 74) {
    return {
      color: "#facc15",
      background: "rgba(250,204,21,0.16)",
      border: "rgba(250,204,21,0.34)",
      label: "İyi",
    };
  }

  if (clampedScore <= 89) {
    return {
      color: "#86efac",
      background: "rgba(134,239,172,0.14)",
      border: "rgba(134,239,172,0.32)",
      label: "Çok iyi",
    };
  }

  return {
    color: "#22c55e",
    background: "rgba(34,197,94,0.16)",
    border: "rgba(34,197,94,0.36)",
    label: "Üst seviye",
  };
}
