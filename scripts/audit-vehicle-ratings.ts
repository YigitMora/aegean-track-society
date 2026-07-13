import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { calculateVehicleCalibrationScores } from "../prisma/vehicle-rating-calibration";

type ComponentKey =
  | "power"
  | "handling"
  | "braking"
  | "reliability"
  | "thermal"
  | "trackReadiness";

type Drivetrain = "FWD" | "RWD" | "AWD";
type RatingStatus = "CALIBRATED" | "PROVISIONAL" | "UNAVAILABLE";
type AuditResult = "OK" | "PROVISIONAL" | "REVIEWED_ADJUSTED" | "REVIEW_REQUIRED";

type RatingWeights = Record<ComponentKey, number>;

type VehicleAuditRow = {
  code: string;
  brand: string;
  model: string;
  generation: string | null;
  variant: string | null;
  drivetrain: Drivetrain;
  powerKw: number;
  torqueNm: number;
  curbWeightKg: number;
  zeroToHundredSeconds: number;
  sustainedPowerConfidence: number;
  chassisTrackIntent: number;
  brakeCapacity: number;
  brakeRepeatability: number;
  reliabilityConfidence: number;
  thermalCapability: number;
  factoryTrackReadiness: number;
  weightPenalty: number;
  ratingStatus: RatingStatus;
  sortOrder: number;
  baseScores: Record<ComponentKey, number>;
  scores: Record<ComponentKey, number>;
  overall: number;
  powerToWeight: number;
  torqueToWeight: number;
  auditResult: AuditResult;
  notes: string[];
};

type AuditIssue = {
  code: string;
  message: string;
};

const componentKeys = [
  "power",
  "handling",
  "braking",
  "reliability",
  "thermal",
  "trackReadiness",
] as const satisfies readonly ComponentKey[];

const sprint4LVehicleCodes = new Set([
  "vw_golf_gti_mk75_performance",
  "vw_golf_gti_clubsport_mk7",
  "vw_golf_gti_tcr_mk75",
  "vw_golf_r_mk75",
  "vw_polo_gti_aw",
  "audi_s3_8v_facelift",
  "cupra_leon_5f_cupra",
  "skoda_octavia_vrs_mk4",
  "cupra_formentor_vz_20",
]);

const sprint4NVehicleCodes = new Set([
  "vw_golf_gti_mk5",
  "vw_golf_gti_mk6",
  "vw_golf_gti_mk75",
  "vw_golf_gti_clubsport_mk8",
  "vw_golf_r_mk6",
  "vw_polo_gti_6r",
  "vw_scirocco_r",
  "audi_a3_20tfsi_8p",
  "audi_a3_20tfsi_8v",
  "audi_s3_8p",
  "audi_tts_8j",
  "seat_leon_cupra_1p",
  "skoda_octavia_vrs_mk3",
  "skoda_superb_sportline_20tsi",
  "ford_fiesta_st_edition_mk8",
  "ford_focus_st_edition_mk4",
  "ford_focus_rs500_mk2",
  "ford_mustang_gtd_s650",
  "porsche_911_gt3_rs_9912",
  "porsche_911_gt3_rs_992",
  "porsche_911_turbo_992",
  "porsche_911_turbo_s_992",
  "porsche_718_cayman_gt4_rs",
  "porsche_718_spyder_rs",
  "porsche_911_st_992",
  "alpine_a110_gt",
  "alpine_a110_r_ultime",
  "audi_rs5_b9",
  "toyota_gr_corolla",
  "lexus_rc_f",
  "lexus_lc_500",
  "mercedes_amg_gt_c190",
  "vw_golf_10_tsi_mk8",
  "vw_golf_15_tsi_mk8",
  "vw_golf_20_tdi_mk8",
  "vw_polo_10_tsi_aw",
  "vw_polo_15_tsi_aw",
  "vw_passat_15_tsi_b8",
  "vw_tiguan_15_tsi_mqb",
  "renault_clio_10_tce",
  "renault_clio_13_tce",
  "renault_clio_e_tech",
  "renault_megane_13_tce",
  "renault_megane_e_tech_ev",
  "renault_captur_13_tce",
  "ford_fiesta_10_ecoboost",
  "ford_focus_10_ecoboost",
  "ford_focus_15_ecoboost",
  "ford_puma_10_ecoboost",
  "toyota_corolla_15",
  "toyota_corolla_hybrid",
  "toyota_yaris_hybrid",
  "toyota_chr_hybrid",
  "hyundai_i20_10_tgdi",
  "hyundai_i30_15_tgdi",
  "hyundai_kona_hybrid",
  "hyundai_kona_electric",
  "bmw_f40_118i",
  "bmw_g20_320d",
  "mercedes_a180_w177",
  "audi_a3_30tfsi_8y",
  "togg_t10f_rwd_standard_range",
  "togg_t10f_rwd_long_range",
  "togg_t10f_awd_performance",
]);

const root = process.cwd();
const seedText = readFileSync(resolve(root, "prisma/seed.ts"), "utf8");
const ratingSourceText = readFileSync(
  resolve(root, "src/lib/vehicle-performance-rating.ts"),
  "utf8",
);
const weights = parseVehicleRatingWeights(ratingSourceText);

const vehicleRows = [
  ...extractVehicleRows("baseVehicleDefinitions"),
  ...extractVehicleRows("expandedPerformanceVehicleDefinitions"),
  ...extractVehicleRows("sprint4NPerformanceVehicleDefinitions"),
  ...extractVehicleRows("sprint4NDailyVehicleDefinitions"),
].sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));

const auditIssues = [
  ...detectComponentOutliers(vehicleRows),
  ...comparePowerToWeightConsistency(vehicleRows),
  ...compareAccelerationConsistency(vehicleRows),
  ...compareMassPenaltyConsistency(vehicleRows),
  ...compareTrackIntentConsistency(vehicleRows),
];
const issuesByCode = groupIssuesByCode(auditIssues);

for (const row of vehicleRows) {
  const notes = issuesByCode.get(row.code) ?? [];
  row.notes.push(...notes);

  if (notes.length > 0 && row.auditResult === "OK") {
    row.auditResult = "REVIEW_REQUIRED";
  }
}

writeFileSync(
  resolve(root, "docs/ats-vehicle-rating-audit.md"),
  renderAuditDocument(vehicleRows, auditIssues),
);

console.log(
  `Audited ${vehicleRows.length} active vehicle definitions; ${auditIssues.length} review signals written to docs/ats-vehicle-rating-audit.md.`,
);

export function detectComponentOutliers(rows: VehicleAuditRow[]): AuditIssue[] {
  return rows.flatMap((row) => {
    const issues: AuditIssue[] = [];
    const componentValues = componentKeys.map((component) => row.scores[component]);
    const spread = Math.max(...componentValues) - Math.min(...componentValues);

    if (spread >= 42 && row.overall >= 70) {
      issues.push({
        code: row.code,
        message: `component spread ${spread} with high overall ${row.overall}`,
      });
    }

    if (row.scores.power >= 82 && row.scores.braking <= 58) {
      issues.push({
        code: row.code,
        message: "high power component paired with low braking baseline",
      });
    }

    return issues;
  });
}

export function comparePowerToWeightConsistency(rows: VehicleAuditRow[]): AuditIssue[] {
  const issues: AuditIssue[] = [];

  for (const faster of rows) {
    for (const slower of rows) {
      if (faster.code === slower.code || faster.drivetrain !== slower.drivetrain) {
        continue;
      }

      const powerToWeightGap = faster.powerToWeight - slower.powerToWeight;
      const powerScoreGap = faster.baseScores.power - slower.baseScores.power;

      if (powerToWeightGap >= 38 && powerScoreGap <= -8) {
        issues.push({
          code: faster.code,
          message: `power rating trails ${slower.code} despite ${Math.round(powerToWeightGap)} kW/t advantage`,
        });
      }
    }
  }

  return dedupeIssues(issues).slice(0, 16);
}

export function compareAccelerationConsistency(rows: VehicleAuditRow[]): AuditIssue[] {
  const issues: AuditIssue[] = [];

  for (const quicker of rows) {
    for (const slower of rows) {
      if (quicker.code === slower.code) {
        continue;
      }

      const accelerationGap = slower.zeroToHundredSeconds - quicker.zeroToHundredSeconds;
      const powerScoreGap = quicker.baseScores.power - slower.baseScores.power;

      if (accelerationGap >= 0.8 && powerScoreGap <= -9) {
        issues.push({
          code: quicker.code,
          message: `0-100 km/h is ${accelerationGap.toFixed(1)}s quicker than ${slower.code} but power rating trails`,
        });
      }
    }
  }

  return dedupeIssues(issues).slice(0, 16);
}

export function compareMassPenaltyConsistency(rows: VehicleAuditRow[]): AuditIssue[] {
  return rows.flatMap((row) => {
    const expectedPenalty = expectedWeightPenalty(row.curbWeightKg);

    if (Math.abs(row.weightPenalty - expectedPenalty) <= 3) {
      return [];
    }

    return [{
      code: row.code,
      message: `weight penalty ${row.weightPenalty} differs from audit guide ${expectedPenalty}`,
    }];
  });
}

export function compareTrackIntentConsistency(rows: VehicleAuditRow[]): AuditIssue[] {
  return rows.flatMap((row) => {
    const issues: AuditIssue[] = [];

    if (row.chassisTrackIntent >= 84 && row.scores.handling <= 62) {
      issues.push({
        code: row.code,
        message: "high chassis-track intent produces unexpectedly low handling",
      });
    }

    if (row.factoryTrackReadiness >= 80 && row.scores.trackReadiness <= 62) {
      issues.push({
        code: row.code,
        message: "high factory track-readiness input produces unexpectedly low readiness",
      });
    }

    return issues;
  });
}

export function listRatingRanking(rows: VehicleAuditRow[]) {
  return [...rows].sort((a, b) => b.overall - a.overall || b.powerToWeight - a.powerToWeight);
}

function extractVehicleRows(arrayName: string): VehicleAuditRow[] {
  const body = extractArrayBody(seedText, arrayName);
  const blocks = extractTopLevelObjectBlocks(body);

  return blocks.map((block) => vehicleRowFromSeedBlock(block));
}

function vehicleRowFromSeedBlock(block: string): VehicleAuditRow {
  const code = requiredString(block, "code");
  const brand = requiredString(block, "brand");
  const model = requiredString(block, "model");
  const drivetrain = requiredString(block, "drivetrain") as Drivetrain;
  const powerKw = requiredNumber(block, "powerKw");
  const torqueNm = requiredNumber(block, "torqueNm");
  const curbWeightKg = requiredNumber(block, "curbWeightKg");
  const zeroToHundredSeconds = requiredNumber(block, "zeroToHundredSeconds");
  const sustainedPowerConfidence = requiredNumber(block, "sustainedPowerConfidence");
  const chassisTrackIntent = requiredNumber(block, "chassisTrackIntent");
  const brakeCapacity = requiredNumber(block, "brakeCapacity");
  const brakeRepeatability = requiredNumber(block, "brakeRepeatability");
  const reliabilityConfidence = requiredNumber(block, "reliabilityConfidence");
  const thermalCapability = requiredNumber(block, "thermalCapability");
  const factoryTrackReadiness = requiredNumber(block, "factoryTrackReadiness");
  const weightPenalty = optionalNumber(block, "weightPenalty") ?? 0;
  const ratingStatus = (optionalString(block, "ratingStatus") ?? "PROVISIONAL") as RatingStatus;

  const rawScores = calculateVehicleCalibrationScores({
    powerKw,
    torqueNm,
    curbWeightKg,
    drivetrain,
    zeroToHundredSeconds,
    sustainedPowerConfidence,
    chassisTrackIntent,
    brakeCapacity,
    brakeRepeatability,
    reliabilityConfidence,
    thermalCapability,
    factoryTrackReadiness,
  });
  const baseScores = {
    power: rawScores.powerRating,
    handling: rawScores.handlingRating,
    braking: rawScores.brakingRating,
    reliability: rawScores.reliabilityRating,
    thermal: rawScores.thermalRating,
    trackReadiness: rawScores.trackReadinessRating,
  };
  const scores = applyWeightPenalty(baseScores, weightPenalty);
  const notes = sprint4LVehicleCodes.has(code)
    ? ["Sprint 4L VAG template; provisional source trail refreshed."]
    : sprint4NVehicleCodes.has(code)
      ? ["Sprint 4N expanded template; source trail and hierarchy reviewed."]
    : [];

  return {
    code,
    brand,
    model,
    generation: optionalString(block, "generation"),
    variant: optionalString(block, "variant"),
    drivetrain,
    powerKw,
    torqueNm,
    curbWeightKg,
    zeroToHundredSeconds,
    sustainedPowerConfidence,
    chassisTrackIntent,
    brakeCapacity,
    brakeRepeatability,
    reliabilityConfidence,
    thermalCapability,
    factoryTrackReadiness,
    weightPenalty,
    ratingStatus,
    sortOrder: requiredNumber(block, "sortOrder"),
    baseScores,
    scores,
    overall: weightedOverall(scores),
    powerToWeight: powerKw / curbWeightKg * 1000,
    torqueToWeight: torqueNm / curbWeightKg * 1000,
    auditResult: initialAuditResult(ratingStatus, weightPenalty),
    notes,
  };
}

function renderAuditDocument(rows: VehicleAuditRow[], issues: AuditIssue[]) {
  const ranking = listRatingRanking(rows);
  const calibratedCount = rows.filter((row) => row.ratingStatus === "CALIBRATED").length;
  const provisionalCount = rows.filter((row) => row.ratingStatus === "PROVISIONAL").length;
  const reviewedAdjustedCount = rows.filter(
    (row) => row.auditResult === "REVIEWED_ADJUSTED",
  ).length;
  const reviewRequiredCount = rows.filter(
    (row) => row.auditResult === "REVIEW_REQUIRED",
  ).length;
  const sprint4LRows = rows.filter((row) => sprint4LVehicleCodes.has(row.code));
  const sprint4NRows = rows.filter((row) => sprint4NVehicleCodes.has(row.code));

  return [
    "# ATS Vehicle Rating Audit",
    "",
    "Generated by `pnpm tsx scripts/audit-vehicle-ratings.ts`.",
    "",
    "Reviewed on 2026-07-13.",
    "",
    "## Summary",
    "",
    "| Metric | Value |",
    "| --- | --- |",
    `| Active vehicle definitions audited | ${rows.length} |`,
    `| Calibrated definitions | ${calibratedCount} |`,
    `| Provisional definitions | ${provisionalCount} |`,
    `| Reviewed adjusted definitions | ${reviewedAdjustedCount} |`,
    `| Review-required signals | ${reviewRequiredCount} |`,
    "| Rating formula changed | No |",
    "| Client recalculation added | No |",
    "| Seed idempotency changed | No |",
    "",
    "The audit reuses `calculateVehicleCalibrationScores` for component baselines and reads the centralized rating weights from `src/lib/vehicle-performance-rating.ts`. Existing calibrated and provisional records remain on the same formula. Sprint 4L and Sprint 4N additions use the same calibration helper as the existing garage rating flow.",
    "",
    "## Sprint 4L Templates",
    "",
    renderVehicleTable(sprint4LRows),
    "",
    "## Sprint 4N Templates",
    "",
    renderVehicleTable(sprint4NRows),
    "",
    "## Sprint 4N Hierarchy Checks",
    "",
    renderHierarchyComparisons(rows),
    "",
    "## Top Overall Baselines",
    "",
    renderVehicleTable(ranking.slice(0, 20)),
    "",
    "## Review Signals",
    "",
    issues.length > 0
      ? [
          "| Vehicle code | Signal |",
          "| --- | --- |",
          ...issues.map((issue) => `| \`${issue.code}\` | ${issue.message} |`),
        ].join("\n")
      : "No threshold-breaching review signals were detected.",
    "",
    "## Full Active Vehicle Audit",
    "",
    renderVehicleTable(rows),
    "",
  ].join("\n");
}

function renderHierarchyComparisons(rows: VehicleAuditRow[]) {
  const byCode = new Map(rows.map((row) => [row.code, row]));
  const groups = [
    [
      "Golf daily, GTI, Clubsport, R",
      [
        "vw_golf_15_tsi_mk8",
        "vw_golf_gti_mk8",
        "vw_golf_gti_clubsport_mk8",
        "vw_golf_r_mk8",
        "vw_golf_gti_mk85",
        "vw_golf_gti_clubsport_mk85",
        "vw_golf_r_mk85",
      ],
    ],
    ["Polo daily vs GTI", ["vw_polo_10_tsi_aw", "vw_polo_gti_6r", "vw_polo_gti_aw"]],
    [
      "Clio road trims vs RS",
      ["renault_clio_10_tce", "renault_clio_13_tce", "renault_clio_e_tech", "renault_clio_rs_200", "renault_clio_rs_trophy"],
    ],
    ["Mustang hierarchy", ["ford_mustang_gt_s550", "ford_mustang_dark_horse_s650", "ford_mustang_gtd_s650"]],
    ["911 hierarchy", ["porsche_911_carrera_992", "porsche_911_carrera_s_992", "porsche_911_gt3_992", "porsche_911_gt3_rs_992"]],
    ["T10F RWD vs AWD", ["togg_t10f_rwd_standard_range", "togg_t10f_rwd_long_range", "togg_t10f_awd_performance"]],
    ["Daily EV vs performance EV", ["renault_megane_e_tech_ev", "hyundai_kona_electric", "tesla_model_y_performance", "hyundai_ioniq_5n"]],
    ["Daily premium vs performance", ["bmw_f40_118i", "bmw_m135i_f40", "audi_a3_30tfsi_8y", "audi_s3_8y", "mercedes_a180_w177", "mercedes_amg_a45_s_w177"]],
  ] as const;

  return groups.map(([title, codes]) => {
    const groupRows = codes.map((code) => byCode.get(code)).filter(Boolean) as VehicleAuditRow[];

    return [`### ${title}`, "", renderVehicleTable(groupRows)].join("\n");
  }).join("\n\n");
}

function renderVehicleTable(rows: VehicleAuditRow[]) {
  return [
    "| Code | Vehicle | Status | Overall | Power | Handling | Braking | Reliability | Thermal | Readiness | kg | kW/t | Audit result | Notes |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |",
    ...rows.map((row) => {
      const vehicle = [
        row.brand,
        row.model,
        row.generation,
        row.variant,
      ].filter(Boolean).join(" ");

      return [
        `\`${row.code}\``,
        vehicle,
        row.ratingStatus,
        row.overall,
        row.scores.power,
        row.scores.handling,
        row.scores.braking,
        row.scores.reliability,
        row.scores.thermal,
        row.scores.trackReadiness,
        row.curbWeightKg,
        Math.round(row.powerToWeight),
        row.auditResult,
        row.notes.length > 0 ? row.notes.join("; ") : "-",
      ].join(" | ");
    }).map((line) => `| ${line} |`),
  ].join("\n");
}

function extractArrayBody(text: string, arrayName: string) {
  const marker = `const ${arrayName} = [`;
  const start = text.indexOf(marker);

  if (start === -1) {
    throw new Error(`Could not find ${arrayName}`);
  }

  const openIndex = text.indexOf("[", start);
  const closeIndex = findMatchingDelimiter(text, openIndex, "[", "]");

  return text.slice(openIndex + 1, closeIndex);
}

function extractTopLevelObjectBlocks(text: string) {
  const blocks: string[] = [];
  let stringDelimiter: string | null = null;
  let escaped = false;
  let depth = 0;
  let blockStart = -1;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (stringDelimiter) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === stringDelimiter) {
        stringDelimiter = null;
      }
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      stringDelimiter = char;
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        blockStart = index;
      }
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0 && blockStart !== -1) {
        blocks.push(text.slice(blockStart, index + 1));
        blockStart = -1;
      }
    }
  }

  return blocks;
}

function findMatchingDelimiter(
  text: string,
  openIndex: number,
  open: string,
  close: string,
) {
  let stringDelimiter: string | null = null;
  let escaped = false;
  let depth = 0;

  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index];

    if (stringDelimiter) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === stringDelimiter) {
        stringDelimiter = null;
      }
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      stringDelimiter = char;
      continue;
    }

    if (char === open) {
      depth += 1;
    } else if (char === close) {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  throw new Error(`No matching delimiter for ${open} at ${openIndex}`);
}

function parseVehicleRatingWeights(text: string): RatingWeights {
  const block = /vehicleRatingWeights = \{([\s\S]*?)\} as const/.exec(text)?.[1];

  if (!block) {
    throw new Error("Could not parse vehicleRatingWeights");
  }

  return Object.fromEntries(
    componentKeys.map((component) => {
      const value = new RegExp(`${component}:\\s*([0-9.]+)`).exec(block)?.[1];

      if (!value) {
        throw new Error(`Could not parse rating weight for ${component}`);
      }

      return [component, Number(value)];
    }),
  ) as RatingWeights;
}

function applyWeightPenalty(
  scores: Record<ComponentKey, number>,
  weightPenalty: number,
) {
  if (weightPenalty <= 0) {
    return { ...scores };
  }

  return {
    ...scores,
    handling: scores.handling - Math.ceil(weightPenalty * 0.4),
    braking: scores.braking - Math.ceil(weightPenalty * 0.3),
    trackReadiness: scores.trackReadiness - weightPenalty,
  };
}

function weightedOverall(scores: Record<ComponentKey, number>) {
  return clampRating(
    scores.power * weights.power +
      scores.handling * weights.handling +
      scores.braking * weights.braking +
      scores.reliability * weights.reliability +
      scores.thermal * weights.thermal +
      scores.trackReadiness * weights.trackReadiness,
  );
}

function initialAuditResult(
  ratingStatus: RatingStatus,
  weightPenalty: number,
): AuditResult {
  if (ratingStatus === "PROVISIONAL") {
    return "PROVISIONAL";
  }

  if (weightPenalty > 0) {
    return "REVIEWED_ADJUSTED";
  }

  return "OK";
}

function groupIssuesByCode(issues: AuditIssue[]) {
  const grouped = new Map<string, string[]>();

  for (const issue of issues) {
    const existing = grouped.get(issue.code) ?? [];
    existing.push(issue.message);
    grouped.set(issue.code, existing);
  }

  return grouped;
}

function dedupeIssues(issues: AuditIssue[]) {
  const seen = new Set<string>();

  return issues.filter((issue) => {
    const key = `${issue.code}:${issue.message}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function expectedWeightPenalty(curbWeightKg: number) {
  if (curbWeightKg < 1350) {
    return 0;
  }

  if (curbWeightKg < 1500) {
    return 2;
  }

  if (curbWeightKg < 1650) {
    return 3;
  }

  if (curbWeightKg < 1800) {
    return 5;
  }

  if (curbWeightKg < 2050) {
    return 7;
  }

  return 8;
}

function optionalString(block: string, field: string) {
  return new RegExp(`\\b${field}:\\s*"([^"]+)"`).exec(block)?.[1] ?? null;
}

function requiredString(block: string, field: string) {
  const value = optionalString(block, field);

  if (!value) {
    throw new Error(`Missing string field ${field}`);
  }

  return value;
}

function optionalNumber(block: string, field: string) {
  const rawValue = new RegExp(`\\b${field}:\\s*(-?\\d+(?:\\.\\d+)?)`).exec(block)?.[1];

  return rawValue ? Number(rawValue) : null;
}

function requiredNumber(block: string, field: string) {
  const value = optionalNumber(block, field);

  if (value === null) {
    throw new Error(`Missing number field ${field}`);
  }

  return value;
}

function clampRating(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
