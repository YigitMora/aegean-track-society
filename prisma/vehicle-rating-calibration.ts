import type { VehicleDrivetrain } from "@prisma/client";

export type VehicleCalibrationEvidence = {
  powerKw: number;
  torqueNm: number;
  curbWeightKg: number;
  drivetrain: VehicleDrivetrain;
  zeroToHundredSeconds?: number;
  sustainedPowerConfidence: number;
  chassisTrackIntent: number;
  brakeCapacity: number;
  brakeRepeatability: number;
  reliabilityConfidence: number;
  thermalCapability: number;
  factoryTrackReadiness: number;
};

export type VehicleCalibrationScores = {
  powerRating: number;
  handlingRating: number;
  brakingRating: number;
  reliabilityRating: number;
  thermalRating: number;
  trackReadinessRating: number;
};

export type VehicleCalibrationAdjustment = Partial<
  Record<keyof VehicleCalibrationScores, number>
>;

export function calculateVehicleCalibrationScores(
  evidence: VehicleCalibrationEvidence,
  adjustment: VehicleCalibrationAdjustment = {},
): VehicleCalibrationScores {
  return {
    powerRating: adjusted(calculatePowerBaseScore(evidence), adjustment.powerRating),
    handlingRating: adjusted(
      calculateHandlingBaseScore(evidence),
      adjustment.handlingRating,
    ),
    brakingRating: adjusted(
      calculateBrakingBaseScore(evidence),
      adjustment.brakingRating,
    ),
    reliabilityRating: adjusted(
      calculateReliabilityBaseScore(evidence),
      adjustment.reliabilityRating,
    ),
    thermalRating: adjusted(
      calculateThermalBaseScore(evidence),
      adjustment.thermalRating,
    ),
    trackReadinessRating: adjusted(
      calculateTrackReadinessBaseScore(evidence),
      adjustment.trackReadinessRating,
    ),
  };
}

export function calculatePowerBaseScore(evidence: VehicleCalibrationEvidence) {
  const powerToWeightKwPerTonne = evidence.powerKw / evidence.curbWeightKg * 1000;
  const torqueToWeightNmPerTonne = evidence.torqueNm / evidence.curbWeightKg * 1000;
  const accelerationScore = evidence.zeroToHundredSeconds
    ? clampScore(106 - evidence.zeroToHundredSeconds * 8.5)
    : 50;

  return clampScore(
    scoreRange(powerToWeightKwPerTonne, 75, 285) * 0.42 +
      scoreRange(torqueToWeightNmPerTonne, 115, 360) * 0.23 +
      accelerationScore * 0.25 +
      evidence.sustainedPowerConfidence * 0.1 +
      drivetrainLaunchBonus(evidence.drivetrain),
  );
}

export function calculateHandlingBaseScore(evidence: VehicleCalibrationEvidence) {
  const lightnessScore = scoreRange(2300 - evidence.curbWeightKg, 0, 1200);
  const trackHardwareScore =
    (evidence.brakeCapacity +
      evidence.brakeRepeatability +
      evidence.thermalCapability +
      evidence.factoryTrackReadiness) /
    4;

  return clampScore(
    lightnessScore * 0.08 +
      evidence.chassisTrackIntent * 0.54 +
      evidence.factoryTrackReadiness * 0.25 +
      trackHardwareScore * 0.08 +
      drivetrainHandlingScore(evidence.drivetrain) * 0.05,
  );
}

export function calculateBrakingBaseScore(evidence: VehicleCalibrationEvidence) {
  const massSupportScore = scoreRange(2300 - evidence.curbWeightKg, 0, 1200);

  return clampScore(
    evidence.brakeCapacity * 0.42 +
      evidence.brakeRepeatability * 0.34 +
      evidence.factoryTrackReadiness * 0.12 +
      evidence.thermalCapability * 0.08 +
      massSupportScore * 0.04,
  );
}

export function calculateReliabilityBaseScore(evidence: VehicleCalibrationEvidence) {
  return clampScore(
    evidence.reliabilityConfidence * 0.62 +
      evidence.thermalCapability * 0.22 +
      evidence.sustainedPowerConfidence * 0.16,
  );
}

export function calculateThermalBaseScore(evidence: VehicleCalibrationEvidence) {
  return clampScore(
    evidence.thermalCapability * 0.66 +
      evidence.sustainedPowerConfidence * 0.18 +
      evidence.brakeRepeatability * 0.1 +
      evidence.factoryTrackReadiness * 0.06,
  );
}

export function calculateTrackReadinessBaseScore(
  evidence: VehicleCalibrationEvidence,
) {
  return clampScore(
    evidence.factoryTrackReadiness * 0.46 +
      evidence.brakeRepeatability * 0.18 +
      evidence.thermalCapability * 0.16 +
      evidence.chassisTrackIntent * 0.14 +
      evidence.brakeCapacity * 0.06,
  );
}

function adjusted(score: number, adjustment = 0) {
  return clampScore(score + adjustment);
}

function drivetrainLaunchBonus(drivetrain: VehicleDrivetrain) {
  if (drivetrain === "AWD") {
    return 4;
  }

  if (drivetrain === "RWD") {
    return 1;
  }

  return 0;
}

function drivetrainHandlingScore(drivetrain: VehicleDrivetrain) {
  if (drivetrain === "RWD") {
    return 74;
  }

  if (drivetrain === "AWD") {
    return 68;
  }

  return 64;
}

function scoreRange(value: number, low: number, high: number) {
  return clampScore((value - low) / (high - low) * 100);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
