import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  calculateVehicleCalibrationScores,
  type VehicleCalibrationEvidence,
} from "../prisma/vehicle-rating-calibration";
import {
  applyWeightPenalty,
  calculateVehicleOverall,
  hasEliteTrackComponentEvidence,
  ratingComponents,
  vehicleRatingWeights,
  weightedOverall,
  type RatingComponent,
  type RatingScoreSet,
} from "../src/lib/vehicle-rating-core";

type ComponentKey = RatingComponent;
type Drivetrain = "FWD" | "RWD" | "AWD";
type Powertrain = "ICE" | "HYBRID" | "ELECTRIC";
type RatingStatus = "CALIBRATED" | "PROVISIONAL" | "UNAVAILABLE";
type AuditResult = "OK" | "PROVISIONAL" | "REVIEWED_ADJUSTED" | "REVIEW_REQUIRED";

type VehicleAuditRow = {
  code: string;
  brand: string;
  model: string;
  generation: string | null;
  variant: string | null;
  powertrain: Powertrain;
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
  legacyBaseScores: RatingScoreSet;
  legacyScores: RatingScoreSet;
  legacyOverall: number;
  baseScores: RatingScoreSet;
  scores: RatingScoreSet;
  baseOverall: number;
  eliteAdjustment: number;
  eliteAdjustmentApplied: boolean;
  overall: number;
  powerToWeight: number;
  torqueToWeight: number;
  auditResult: AuditResult;
  notes: string[];
  sourceConfidence: "HIGH" | "MEDIUM" | "PROVISIONAL";
};

type AuditIssue = {
  code: string;
  message: string;
};

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

const sprint4OReferenceVehicleCodes = new Set([
  "porsche_911_gt2_rs_9912",
  "mercedes_amg_gt_black_series_c190",
  "bmw_m4_csl_g82",
  "chevrolet_corvette_z06_c8",
  "mclaren_765lt",
  "lamborghini_huracan_sto",
]);

const ordinaryPreservationCodes = [
  "vw_golf_10_tsi_mk8",
  "vw_golf_15_tsi_mk8",
  "vw_polo_10_tsi_aw",
  "renault_clio_10_tce",
  "toyota_corolla_15",
  "toyota_corolla_hybrid",
  "bmw_g20_320i_tr_lci",
  "bmw_f40_118i",
  "mercedes_a180_w177",
  "audi_a3_30tfsi_8y",
  "tesla_model_y_rwd",
  "hyundai_kona_electric",
  "togg_t10f_rwd_standard_range",
] as const;

const eliteReviewCodes = new Set([
  "porsche_911_gt3_992",
  "porsche_911_gt3_rs_9912",
  "porsche_911_gt3_rs_992",
  "porsche_911_gt2_rs_9912",
  "porsche_718_cayman_gt4",
  "porsche_718_cayman_gt4_rs",
  "ford_mustang_gtd_s650",
  "mercedes_amg_gt_black_series_c190",
  "bmw_m4_csl_g82",
  "mclaren_765lt",
  "lamborghini_huracan_sto",
]);

const root = process.cwd();
const seedText = readFileSync(resolve(root, "prisma/seed.ts"), "utf8");

const vehicleRows = [
  ...extractVehicleRows("baseVehicleDefinitions"),
  ...extractVehicleRows("expandedPerformanceVehicleDefinitions"),
  ...extractVehicleRows("sprint4NPerformanceVehicleDefinitions"),
  ...extractVehicleRows("sprint4OReferenceVehicleDefinitions"),
  ...extractVehicleRows("sprint4NDailyVehicleDefinitions"),
].sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));

const auditIssues = [
  ...detectComponentOutliers(vehicleRows),
  ...detectEliteCandidateCompression(vehicleRows),
  ...detectHighOverallWithoutEliteSupport(vehicleRows),
  ...detectPowerReadinessMismatch(vehicleRows),
  ...detectOrdinaryRoadVehicleInflation(vehicleRows),
  ...detectHeavyVehicleInflation(vehicleRows),
  ...detectTrackSpecialReadiness(vehicleRows),
  ...detectHierarchyIssues(vehicleRows),
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

if (auditIssues.length > 0) {
  console.log("Review signals are reported in the audit document; inspect before production seed activation.");
}

export function detectComponentOutliers(rows: VehicleAuditRow[]): AuditIssue[] {
  return rows.flatMap((row) => {
    const issues: AuditIssue[] = [];
    const componentValues = ratingComponents.map((component) => row.scores[component]);
    const spread = Math.max(...componentValues) - Math.min(...componentValues);

    if (spread >= 44 && row.overall >= 72) {
      issues.push({
        code: row.code,
        message: `component spread ${spread} with high overall ${row.overall}`,
      });
    }

    if (row.scores.power >= 88 && row.scores.braking <= 60) {
      issues.push({
        code: row.code,
        message: "high power component paired with low braking baseline",
      });
    }

    return issues;
  });
}

export function detectEliteCandidateCompression(rows: VehicleAuditRow[]): AuditIssue[] {
  return rows.flatMap((row) => {
    if (!isEliteFactoryTrackCandidate(row) || row.overall >= 88) {
      return [];
    }

    return [{
      code: row.code,
      message: `elite track candidate remains compressed at overall ${row.overall}`,
    }];
  });
}

export function detectHighOverallWithoutEliteSupport(rows: VehicleAuditRow[]): AuditIssue[] {
  return rows.flatMap((row) => {
    if (row.overall < 90 || hasEliteTrackComponentEvidence(row.scores)) {
      return [];
    }

    return [{
      code: row.code,
      message: "overall 90+ without elite Handling/Braking/Thermal/Readiness support",
    }];
  });
}

export function detectPowerReadinessMismatch(rows: VehicleAuditRow[]): AuditIssue[] {
  return rows.flatMap((row) => {
    if (
      row.scores.power <= 90 ||
      row.scores.trackReadiness <= 90 ||
      isEliteFactoryTrackCandidate(row)
    ) {
      return [];
    }

    return [{
      code: row.code,
      message: "high Power and Track Readiness require stronger multi-component track evidence",
    }];
  });
}

export function detectOrdinaryRoadVehicleInflation(rows: VehicleAuditRow[]): AuditIssue[] {
  return rows.flatMap((row) => {
    const ordinaryByEvidence =
      row.factoryTrackReadiness <= 55 &&
      row.chassisTrackIntent <= 65 &&
      row.brakeRepeatability <= 62;
    const ordinaryByCode = ordinaryPreservationCodes.includes(
      row.code as (typeof ordinaryPreservationCodes)[number],
    );

    if ((!ordinaryByEvidence && !ordinaryByCode) || row.overall <= 75) {
      return [];
    }

    return [{
      code: row.code,
      message: `ordinary road-car preservation breach at overall ${row.overall}`,
    }];
  });
}

export function detectHeavyVehicleInflation(rows: VehicleAuditRow[]): AuditIssue[] {
  return rows.flatMap((row) => {
    const issues: AuditIssue[] = [];
    const modelText = `${row.brand} ${row.model} ${row.variant ?? ""}`.toLowerCase();
    const isSuvOrCrossover = [
      "x3",
      "x4",
      "model y",
      "t10x",
      "t10f",
      "formentor",
      "kona",
      "tiguan",
      "captur",
      "puma",
      "c-hr",
    ].some((term) => modelText.includes(term));

    if (isSuvOrCrossover && row.curbWeightKg >= 1600 && row.scores.handling > 76) {
      issues.push({
        code: row.code,
        message: `heavy SUV/crossover handling ${row.scores.handling} exceeds credibility threshold`,
      });
    }

    if (
      row.powertrain === "ELECTRIC" &&
      row.curbWeightKg >= 1800 &&
      (row.scores.handling > 78 || row.scores.trackReadiness > 78)
    ) {
      issues.push({
        code: row.code,
        message: "heavy EV mass penalty no longer constrains Handling/Track Readiness",
      });
    }

    return issues;
  });
}

export function detectTrackSpecialReadiness(rows: VehicleAuditRow[]): AuditIssue[] {
  return rows.flatMap((row) => {
    const isTrackSpecial =
      row.ratingStatus === "CALIBRATED" &&
      row.factoryTrackReadiness >= 88 &&
      row.chassisTrackIntent >= 90 &&
      row.brakeRepeatability >= 86;

    if (!isTrackSpecial || row.scores.trackReadiness >= 88) {
      return [];
    }

    return [{
      code: row.code,
      message: `track special readiness remains below 88 at ${row.scores.trackReadiness}`,
    }];
  });
}

export function detectHierarchyIssues(rows: VehicleAuditRow[]): AuditIssue[] {
  const byCode = new Map(rows.map((row) => [row.code, row]));
  const issues: AuditIssue[] = [];

  requireComponentLead({
    byCode,
    leaderCode: "porsche_911_gt3_rs_992",
    followerCode: "porsche_911_gt3_992",
    components: ["handling", "braking", "thermal", "trackReadiness"],
    issues,
  });
  requireComponentLead({
    byCode,
    leaderCode: "porsche_718_cayman_gt4_rs",
    followerCode: "porsche_718_cayman_gt4",
    components: ["power", "handling", "braking", "thermal", "trackReadiness"],
    issues,
  });
  requireComponentLead({
    byCode,
    leaderCode: "ford_mustang_gtd_s650",
    followerCode: "ford_mustang_dark_horse_s650",
    components: ["power", "handling", "braking", "thermal", "trackReadiness"],
    issues,
  });
  requireComponentLead({
    byCode,
    leaderCode: "ford_mustang_dark_horse_s650",
    followerCode: "ford_mustang_gt_s550",
    components: ["handling", "braking", "thermal", "trackReadiness"],
    issues,
  });
  requireComponentLead({
    byCode,
    leaderCode: "mercedes_amg_gt_black_series_c190",
    followerCode: "mercedes_amg_gt_c190",
    components: ["power", "handling", "braking", "thermal", "trackReadiness"],
    issues,
  });
  requireComponentLead({
    byCode,
    leaderCode: "bmw_m4_csl_g82",
    followerCode: "bmw_m4_g82",
    components: ["trackReadiness"],
    issues,
  });

  requireOverallLead(byCode, "vw_golf_gti_mk8", "vw_golf_15_tsi_mk8", issues);
  requireOverallLead(byCode, "vw_polo_gti_aw", "vw_polo_10_tsi_aw", issues);
  requireOverallLead(byCode, "mercedes_amg_a45_s_w177", "mercedes_a180_w177", issues);
  requireOverallLead(byCode, "bmw_m3_g80", "bmw_g20_320d", issues);

  return issues;
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

      if (powerToWeightGap >= 42 && powerScoreGap <= -8) {
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

      if (accelerationGap >= 0.9 && powerScoreGap <= -9) {
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
  const powertrain = (optionalString(block, "powertrain") ?? "ICE") as Powertrain;
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
  const evidence = {
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
  } satisfies VehicleCalibrationEvidence;

  const rawScores = calculateVehicleCalibrationScores(evidence);
  const baseScores = scoreSetFromCalibration(rawScores);
  const scores = clampScoreSet(applyWeightPenalty(baseScores, weightPenalty));
  const overallResult = calculateVehicleOverall({
    rating: scores,
    status: ratingStatus,
  });
  const legacyBaseScores = calculateLegacyCalibrationScores(evidence);
  const legacyScores = clampScoreSet(applyLegacyWeightPenalty(legacyBaseScores, weightPenalty));
  const notes = initialNotesForCode(code);

  return {
    code,
    brand,
    model,
    generation: optionalString(block, "generation"),
    variant: optionalString(block, "variant"),
    powertrain,
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
    legacyBaseScores,
    legacyScores,
    legacyOverall: weightedOverall(legacyScores),
    baseScores,
    scores,
    baseOverall: overallResult.baseOverall,
    eliteAdjustment: overallResult.eliteAdjustment,
    eliteAdjustmentApplied: overallResult.eliteAdjustmentApplied,
    overall: overallResult.overall,
    powerToWeight: powerKw / curbWeightKg * 1000,
    torqueToWeight: torqueNm / curbWeightKg * 1000,
    auditResult: initialAuditResult(ratingStatus, weightPenalty, code),
    notes,
    sourceConfidence: sourceConfidenceForRow(code, ratingStatus),
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
  const sprint4ORows = rows.filter((row) => sprint4OReferenceVehicleCodes.has(row.code));
  const eliteCandidateRows = rows.filter((row) => isEliteFactoryTrackCandidate(row));
  const ordinaryRows = ordinaryPreservationCodes
    .map((code) => rows.find((row) => row.code === code))
    .filter(Boolean) as VehicleAuditRow[];
  const adjustedRows = rows.filter((row) => {
    const changedOverall = row.overall !== row.legacyOverall;

    return changedOverall || sprint4OReferenceVehicleCodes.has(row.code) || eliteReviewCodes.has(row.code);
  });
  const provisionalRows = rows.filter((row) => row.ratingStatus === "PROVISIONAL");

  return [
    "# ATS Vehicle Rating Audit",
    "",
    "Generated by `pnpm exec tsx scripts/audit-vehicle-ratings.ts`.",
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
    "| Rating formula weights changed | No |",
    `| Weights | ${renderWeights()} |`,
    "| Client recalculation added | No |",
    "| Seed idempotency changed | No |",
    "",
    "The audit uses `calculateVehicleCalibrationScores` for current component baselines and the shared `src/lib/vehicle-rating-core.ts` helpers for weight penalty, elite adjustment, clamping, and weighted Overall. Legacy formulas are retained in this script only to show old-versus-new movement in the adjusted-vehicles table.",
    "",
    "## Sprint 4L Templates",
    "",
    renderVehicleTable(sprint4LRows),
    "",
    "## Sprint 4N Templates",
    "",
    renderVehicleTable(sprint4NRows),
    "",
    "## Sprint 4O Reference Templates",
    "",
    renderVehicleTable(sprint4ORows),
    "",
    "## Sprint 4O Hierarchy Checks",
    "",
    renderHierarchyComparisons(rows),
    "",
    "## Top 25 Overall",
    "",
    renderVehicleTable(ranking.slice(0, 25)),
    "",
    "## Top 25 Power",
    "",
    renderComponentRanking(rows, "power"),
    "",
    "## Top 25 Handling",
    "",
    renderComponentRanking(rows, "handling"),
    "",
    "## Top 25 Braking",
    "",
    renderComponentRanking(rows, "braking"),
    "",
    "## Top 25 Thermal",
    "",
    renderComponentRanking(rows, "thermal"),
    "",
    "## Top 25 Track Readiness",
    "",
    renderComponentRanking(rows, "trackReadiness"),
    "",
    "## Elite Candidate Table",
    "",
    renderAdjustedVehicleTable(eliteCandidateRows),
    "",
    "## Ordinary-Car Preservation Table",
    "",
    renderVehicleTable(ordinaryRows),
    "",
    "## Adjusted Vehicles",
    "",
    renderAdjustedVehicleTable(adjustedRows),
    "",
    "## Remaining Provisional Vehicles",
    "",
    renderVehicleTable(provisionalRows),
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
    ["911 GT hierarchy", ["porsche_911_gt3_992", "porsche_911_gt3_rs_9912", "porsche_911_gt3_rs_992", "porsche_911_gt2_rs_9912"]],
    ["718 GT4 hierarchy", ["porsche_718_cayman_gt4", "porsche_718_cayman_gt4_rs"]],
    ["AMG GT hierarchy", ["mercedes_amg_gt_c190", "mercedes_amg_gt_black_series_c190"]],
    ["BMW G8x hierarchy", ["bmw_m4_g82", "bmw_m4_csl_g82"]],
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
    "| Code | Vehicle | Status | Overall | Power | Handling | Braking | Reliability | Thermal | Readiness | kg | kW/t | Elite adj. | Audit result | Notes |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |",
    ...rows.map((row) => {
      const vehicle = vehicleName(row);

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
        row.eliteAdjustment,
        row.auditResult,
        row.notes.length > 0 ? row.notes.join("; ") : "-",
      ].join(" | ");
    }).map((line) => `| ${line} |`),
  ].join("\n");
}

function renderComponentRanking(rows: VehicleAuditRow[], component: ComponentKey) {
  const rankedRows = [...rows]
    .sort((a, b) => b.scores[component] - a.scores[component] || b.overall - a.overall)
    .slice(0, 25);

  return [
    "| Rank | Code | Vehicle | Component | Overall | Status |",
    "| ---: | --- | --- | ---: | ---: | --- |",
    ...rankedRows.map((row, index) =>
      `| ${index + 1} | \`${row.code}\` | ${vehicleName(row)} | ${row.scores[component]} | ${row.overall} | ${row.ratingStatus} |`,
    ),
  ].join("\n");
}

function renderAdjustedVehicleTable(rows: VehicleAuditRow[]) {
  if (rows.length === 0) {
    return "No adjusted vehicles in this audit slice.";
  }

  return [
    "| Code | Vehicle | Old scores | New scores | Overall old -> new | Reason | Source confidence | Elite adjustment |",
    "| --- | --- | --- | --- | ---: | --- | --- | ---: |",
    ...rows.map((row) =>
      [
        `\`${row.code}\``,
        vehicleName(row),
        renderScores(row.legacyScores),
        renderScores(row.scores),
        `${row.legacyOverall} -> ${row.overall}`,
        adjustmentReason(row),
        row.sourceConfidence,
        row.eliteAdjustmentApplied ? row.eliteAdjustment : 0,
      ].join(" | "),
    ).map((line) => `| ${line} |`),
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

function scoreSetFromCalibration(scores: {
  powerRating: number;
  handlingRating: number;
  brakingRating: number;
  reliabilityRating: number;
  thermalRating: number;
  trackReadinessRating: number;
}): RatingScoreSet {
  return {
    power: scores.powerRating,
    handling: scores.handlingRating,
    braking: scores.brakingRating,
    reliability: scores.reliabilityRating,
    thermal: scores.thermalRating,
    trackReadiness: scores.trackReadinessRating,
  };
}

function calculateLegacyCalibrationScores(
  evidence: VehicleCalibrationEvidence,
): RatingScoreSet {
  return {
    power: legacyPowerBaseScore(evidence),
    handling: legacyHandlingBaseScore(evidence),
    braking: legacyBrakingBaseScore(evidence),
    reliability: legacyReliabilityBaseScore(evidence),
    thermal: legacyThermalBaseScore(evidence),
    trackReadiness: legacyTrackReadinessBaseScore(evidence),
  };
}

function legacyPowerBaseScore(evidence: VehicleCalibrationEvidence) {
  const powerToWeightKwPerTonne = evidence.powerKw / evidence.curbWeightKg * 1000;
  const torqueToWeightNmPerTonne = evidence.torqueNm / evidence.curbWeightKg * 1000;
  const accelerationScore = evidence.zeroToHundredSeconds
    ? clampRating(106 - evidence.zeroToHundredSeconds * 8.5)
    : 50;

  return clampRating(
    scoreRange(powerToWeightKwPerTonne, 75, 285) * 0.42 +
      scoreRange(torqueToWeightNmPerTonne, 115, 360) * 0.23 +
      accelerationScore * 0.25 +
      evidence.sustainedPowerConfidence * 0.1 +
      drivetrainLaunchBonus(evidence.drivetrain),
  );
}

function legacyHandlingBaseScore(evidence: VehicleCalibrationEvidence) {
  const lightnessScore = scoreRange(2300 - evidence.curbWeightKg, 0, 1200);

  return clampRating(
    lightnessScore * 0.34 +
      evidence.chassisTrackIntent * 0.46 +
      drivetrainHandlingScore(evidence.drivetrain) * 0.12 +
      evidence.factoryTrackReadiness * 0.08,
  );
}

function legacyBrakingBaseScore(evidence: VehicleCalibrationEvidence) {
  const massPenalty = scoreRange(2300 - evidence.curbWeightKg, 0, 1200);

  return clampRating(
    evidence.brakeCapacity * 0.48 +
      evidence.brakeRepeatability * 0.34 +
      massPenalty * 0.18,
  );
}

function legacyReliabilityBaseScore(evidence: VehicleCalibrationEvidence) {
  return clampRating(
    evidence.reliabilityConfidence * 0.62 +
      evidence.thermalCapability * 0.22 +
      evidence.sustainedPowerConfidence * 0.16,
  );
}

function legacyThermalBaseScore(evidence: VehicleCalibrationEvidence) {
  return clampRating(
    evidence.thermalCapability * 0.62 +
      evidence.brakeRepeatability * 0.22 +
      evidence.sustainedPowerConfidence * 0.16,
  );
}

function legacyTrackReadinessBaseScore(evidence: VehicleCalibrationEvidence) {
  return clampRating(
    evidence.factoryTrackReadiness * 0.42 +
      evidence.brakeRepeatability * 0.22 +
      evidence.thermalCapability * 0.16 +
      evidence.chassisTrackIntent * 0.14 +
      evidence.brakeCapacity * 0.06,
  );
}

function applyLegacyWeightPenalty(
  scores: RatingScoreSet,
  weightPenalty: number,
): RatingScoreSet {
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

function initialAuditResult(
  ratingStatus: RatingStatus,
  weightPenalty: number,
  code: string,
): AuditResult {
  if (ratingStatus === "PROVISIONAL") {
    return "PROVISIONAL";
  }

  if (weightPenalty > 0 || eliteReviewCodes.has(code) || sprint4OReferenceVehicleCodes.has(code)) {
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

function clampScoreSet(scores: RatingScoreSet): RatingScoreSet {
  return Object.fromEntries(
    ratingComponents.map((component) => [component, clampRating(scores[component])]),
  ) as RatingScoreSet;
}

function clampRating(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreRange(value: number, low: number, high: number) {
  return clampRating((value - low) / (high - low) * 100);
}

function drivetrainLaunchBonus(drivetrain: Drivetrain) {
  if (drivetrain === "AWD") {
    return 4;
  }

  if (drivetrain === "RWD") {
    return 1;
  }

  return 0;
}

function drivetrainHandlingScore(drivetrain: Drivetrain) {
  if (drivetrain === "RWD") {
    return 74;
  }

  if (drivetrain === "AWD") {
    return 68;
  }

  return 64;
}

function isEliteFactoryTrackCandidate(row: VehicleAuditRow) {
  return (
    row.ratingStatus === "CALIBRATED" &&
    row.factoryTrackReadiness >= 93 &&
    row.chassisTrackIntent >= 93 &&
    row.brakeCapacity >= 91 &&
    row.brakeRepeatability >= 90 &&
    row.thermalCapability >= 88 &&
    row.scores.handling >= 88 &&
    row.scores.braking >= 88 &&
    row.scores.trackReadiness >= 90
  );
}

function requireComponentLead({
  byCode,
  leaderCode,
  followerCode,
  components,
  issues,
}: {
  byCode: Map<string, VehicleAuditRow>;
  leaderCode: string;
  followerCode: string;
  components: ComponentKey[];
  issues: AuditIssue[];
}) {
  const leader = byCode.get(leaderCode);
  const follower = byCode.get(followerCode);

  if (!leader || !follower) {
    return;
  }

  for (const component of components) {
    if (leader.scores[component] <= follower.scores[component]) {
      issues.push({
        code: leaderCode,
        message: `${component} ${leader.scores[component]} does not exceed ${followerCode} ${follower.scores[component]}`,
      });
    }
  }
}

function requireOverallLead(
  byCode: Map<string, VehicleAuditRow>,
  leaderCode: string,
  followerCode: string,
  issues: AuditIssue[],
) {
  const leader = byCode.get(leaderCode);
  const follower = byCode.get(followerCode);

  if (!leader || !follower || leader.overall > follower.overall) {
    return;
  }

  issues.push({
    code: leaderCode,
    message: `performance trim overall ${leader.overall} does not exceed ordinary trim ${followerCode} ${follower.overall}`,
  });
}

function initialNotesForCode(code: string) {
  if (sprint4OReferenceVehicleCodes.has(code)) {
    return ["Sprint 4O upper-scale reference; official-source trail reviewed."];
  }

  if (sprint4LVehicleCodes.has(code)) {
    return ["Sprint 4L VAG template; provisional source trail refreshed."];
  }

  if (sprint4NVehicleCodes.has(code)) {
    return ["Sprint 4N expanded template; source trail and hierarchy reviewed."];
  }

  return [];
}

function sourceConfidenceForRow(
  code: string,
  ratingStatus: RatingStatus,
): VehicleAuditRow["sourceConfidence"] {
  if (ratingStatus === "PROVISIONAL") {
    return "PROVISIONAL";
  }

  if (sprint4OReferenceVehicleCodes.has(code) || eliteReviewCodes.has(code)) {
    return "HIGH";
  }

  return "MEDIUM";
}

function adjustmentReason(row: VehicleAuditRow) {
  if (sprint4OReferenceVehicleCodes.has(row.code)) {
    return "Sprint 4O reference addition with official-source evidence.";
  }

  if (row.eliteAdjustmentApplied) {
    return "Elite track evidence adjustment applied after component recalibration.";
  }

  if (row.overall !== row.legacyOverall) {
    return "Component normalization recalibrated upper-scale headroom.";
  }

  return "Reviewed reference row; score unchanged.";
}

function vehicleName(row: VehicleAuditRow) {
  return [
    row.brand,
    row.model,
    row.generation,
    row.variant,
  ].filter(Boolean).join(" ");
}

function renderScores(scores: RatingScoreSet) {
  return ratingComponents
    .map((component) => `${componentLabel(component)} ${scores[component]}`)
    .join(", ");
}

function componentLabel(component: ComponentKey) {
  return {
    power: "P",
    handling: "H",
    braking: "B",
    reliability: "R",
    thermal: "T",
    trackReadiness: "TR",
  }[component];
}

function renderWeights() {
  return ratingComponents
    .map((component) => `${component} ${vehicleRatingWeights[component]}`)
    .join(", ");
}
