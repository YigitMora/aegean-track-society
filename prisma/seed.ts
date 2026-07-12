import { Prisma, PrismaClient, type ModificationUsageClass } from "@prisma/client";
import { calculateVehicleCalibrationScores } from "./vehicle-rating-calibration";

const prisma = new PrismaClient();

const eventSlug = "kula-mytrack-2026";
const sep20 = new Date("2026-09-20T00:00:00.000Z");
// Platform-specific definitions start inactive and are reactivated below only
// after Sprint 4B template-based compatibility rows have been seeded.
const modificationCatalog = [
  {
    code: "suspension_sport_springs_generic",
    category: "SUSPENSION",
    brand: "Generic",
    name: "Sport Springs",
    componentTypeCode: "sport_springs",
    usageClass: "FAST_ROAD",
    handlingImpact: 2,
    trackReadinessImpact: 1,
    sortOrder: 10,
  },
  {
    code: "suspension_coilover_jom",
    category: "SUSPENSION",
    brand: "JOM",
    name: "Coilover",
    componentTypeCode: "coilover",
    usageClass: "FAST_ROAD",
    handlingImpact: 3,
    reliabilityImpact: -1,
    trackReadinessImpact: 2,
    sortOrder: 20,
  },
  {
    code: "suspension_coilover_st_x",
    category: "SUSPENSION",
    brand: "ST",
    name: "Coilover",
    variant: "X",
    componentTypeCode: "coilover",
    usageClass: "FAST_ROAD",
    handlingImpact: 4,
    trackReadinessImpact: 3,
    sortOrder: 30,
  },
  {
    code: "suspension_coilover_st_xa",
    category: "SUSPENSION",
    brand: "ST",
    name: "Coilover",
    variant: "XA",
    componentTypeCode: "coilover",
    usageClass: "STREET_TRACK",
    handlingImpact: 5,
    trackReadinessImpact: 4,
    sortOrder: 40,
  },
  {
    code: "suspension_coilover_kw_v1",
    category: "SUSPENSION",
    brand: "KW",
    name: "Coilover",
    variant: "V1",
    componentTypeCode: "coilover",
    usageClass: "FAST_ROAD",
    handlingImpact: 4,
    trackReadinessImpact: 3,
    sortOrder: 50,
  },
  {
    code: "suspension_coilover_kw_v3",
    category: "SUSPENSION",
    brand: "KW",
    name: "Coilover",
    variant: "V3",
    componentTypeCode: "coilover",
    usageClass: "STREET_TRACK",
    handlingImpact: 6,
    trackReadinessImpact: 5,
    sortOrder: 60,
  },
  {
    code: "suspension_coilover_kw_clubsport",
    category: "SUSPENSION",
    brand: "KW",
    name: "Coilover",
    variant: "Clubsport",
    componentTypeCode: "coilover",
    usageClass: "TRACK",
    handlingImpact: 8,
    reliabilityImpact: -1,
    trackReadinessImpact: 7,
    sortOrder: 70,
  },
  {
    code: "suspension_coilover_ohlins_road_track",
    category: "SUSPENSION",
    brand: "Ohlins",
    name: "Coilover",
    variant: "Road & Track",
    componentTypeCode: "coilover",
    usageClass: "STREET_TRACK",
    handlingImpact: 7,
    trackReadinessImpact: 6,
    sortOrder: 80,
  },
  {
    code: "suspension_coilover_nitron_ntr_r1",
    category: "SUSPENSION",
    brand: "Nitron",
    name: "Coilover",
    variant: "NTR R1",
    componentTypeCode: "coilover",
    usageClass: "STREET_TRACK",
    handlingImpact: 6,
    trackReadinessImpact: 5,
    sortOrder: 90,
  },
  {
    code: "suspension_coilover_nitron_ntr_r3",
    category: "SUSPENSION",
    brand: "Nitron",
    name: "Coilover",
    variant: "NTR R3",
    componentTypeCode: "coilover",
    usageClass: "TRACK",
    handlingImpact: 8,
    reliabilityImpact: -1,
    trackReadinessImpact: 7,
    sortOrder: 100,
  },
  {
    code: "suspension_adjustable_front_camber_hardware",
    category: "SUSPENSION",
    name: "Camber Hardware",
    variant: "Adjustable front",
    componentTypeCode: "camber_hardware",
    usageClass: "STREET_TRACK",
    handlingImpact: 3,
    trackReadinessImpact: 2,
    sortOrder: 110,
  },
  {
    code: "suspension_rear_anti_roll_bar",
    category: "SUSPENSION",
    name: "Anti-roll Bar",
    variant: "Rear",
    componentTypeCode: "anti_roll_bar",
    usageClass: "FAST_ROAD",
    handlingImpact: 2,
    trackReadinessImpact: 1,
    sortOrder: 120,
  },
  {
    code: "brakes_performance_pads",
    category: "BRAKES",
    name: "Brake Pad",
    variant: "Legacy performance",
    componentTypeCode: "brake_pad",
    usageClass: "FAST_ROAD",
    brakingImpact: 3,
    trackReadinessImpact: 2,
    active: false,
    sortOrder: 10,
  },
  {
    code: "brakes_track_pads",
    category: "BRAKES",
    name: "Brake Pad",
    variant: "Legacy track",
    componentTypeCode: "brake_pad",
    usageClass: "TRACK",
    brakingImpact: 6,
    reliabilityImpact: -1,
    trackReadinessImpact: 5,
    active: false,
    sortOrder: 20,
  },
  {
    code: "brakes_braided_lines",
    category: "BRAKES",
    name: "Braided Brake Line",
    componentTypeCode: "braided_brake_line",
    usageClass: "FAST_ROAD",
    brakingImpact: 2,
    trackReadinessImpact: 2,
    sortOrder: 30,
  },
  {
    code: "brakes_high_temperature_fluid",
    category: "BRAKES",
    name: "Brake Fluid",
    variant: "High-temperature",
    componentTypeCode: "brake_fluid",
    usageClass: "STREET_TRACK",
    brakingImpact: 3,
    trackReadinessImpact: 4,
    sortOrder: 40,
  },
  {
    code: "brakes_big_brake_kit",
    category: "BRAKES",
    name: "Big Brake Kit",
    componentTypeCode: "big_brake_kit",
    usageClass: "TRACK",
    brakingImpact: 8,
    trackReadinessImpact: 6,
    sortOrder: 50,
  },
  {
    code: "brakes_cooling_ducts",
    category: "BRAKES",
    name: "Brake Cooling",
    variant: "Ducts",
    componentTypeCode: "brake_cooling",
    usageClass: "TRACK",
    brakingImpact: 2,
    reliabilityImpact: 1,
    trackReadinessImpact: 3,
    sortOrder: 60,
  },
  {
    code: "brake_pad_ebc_redstuff",
    category: "BRAKES",
    brand: "EBC",
    name: "Brake Pad",
    variant: "Redstuff",
    componentTypeCode: "brake_pad",
    usageClass: "FAST_ROAD",
    brakingImpact: 2,
    trackReadinessImpact: 1,
    sortOrder: 110,
  },
  {
    code: "brake_pad_ebc_yellowstuff",
    category: "BRAKES",
    brand: "EBC",
    name: "Brake Pad",
    variant: "Yellowstuff",
    componentTypeCode: "brake_pad",
    usageClass: "STREET_TRACK",
    brakingImpact: 3,
    trackReadinessImpact: 2,
    sortOrder: 120,
  },
  {
    code: "brake_pad_ebc_bluestuff_ndx",
    category: "BRAKES",
    brand: "EBC",
    name: "Brake Pad",
    variant: "Bluestuff NDX",
    componentTypeCode: "brake_pad",
    usageClass: "TRACK",
    brakingImpact: 4,
    trackReadinessImpact: 3,
    sortOrder: 130,
  },
  {
    code: "brake_pad_ebc_rp_x",
    category: "BRAKES",
    brand: "EBC",
    name: "Brake Pad",
    variant: "RP-X",
    componentTypeCode: "brake_pad",
    usageClass: "SPRINT",
    brakingImpact: 5,
    trackReadinessImpact: 4,
    sortOrder: 140,
  },
  {
    code: "brake_pad_ebc_sr11",
    category: "BRAKES",
    brand: "EBC",
    name: "Brake Pad",
    variant: "SR11",
    componentTypeCode: "brake_pad",
    usageClass: "ENDURANCE",
    brakingImpact: 5,
    trackReadinessImpact: 5,
    sortOrder: 150,
  },
  {
    code: "brake_pad_ebc_sr21",
    category: "BRAKES",
    brand: "EBC",
    name: "Brake Pad",
    variant: "SR21",
    componentTypeCode: "brake_pad",
    usageClass: "SPRINT",
    brakingImpact: 6,
    trackReadinessImpact: 5,
    sortOrder: 160,
  },
  {
    code: "brake_pad_pagid_rsl_1",
    category: "BRAKES",
    brand: "Pagid Racing",
    name: "Brake Pad",
    variant: "RSL 1",
    componentTypeCode: "brake_pad",
    usageClass: "ENDURANCE",
    brakingImpact: 5,
    trackReadinessImpact: 5,
    sortOrder: 170,
  },
  {
    code: "brake_pad_pagid_rsl_29",
    category: "BRAKES",
    brand: "Pagid Racing",
    name: "Brake Pad",
    variant: "RSL 29",
    componentTypeCode: "brake_pad",
    usageClass: "ENDURANCE",
    brakingImpact: 5,
    trackReadinessImpact: 5,
    sortOrder: 180,
  },
  {
    code: "brake_pad_ferodo_ds_performance",
    category: "BRAKES",
    brand: "Ferodo Racing",
    name: "Brake Pad",
    variant: "DS Performance",
    componentTypeCode: "brake_pad",
    usageClass: "FAST_ROAD",
    brakingImpact: 2,
    trackReadinessImpact: 1,
    sortOrder: 190,
  },
  {
    code: "brake_pad_ferodo_ds2500",
    category: "BRAKES",
    brand: "Ferodo Racing",
    name: "Brake Pad",
    variant: "DS2500",
    componentTypeCode: "brake_pad",
    usageClass: "STREET_TRACK",
    brakingImpact: 3,
    trackReadinessImpact: 2,
    sortOrder: 200,
  },
  {
    code: "brake_pad_ferodo_ds1_11",
    category: "BRAKES",
    brand: "Ferodo Racing",
    name: "Brake Pad",
    variant: "DS1.11",
    componentTypeCode: "brake_pad",
    usageClass: "ENDURANCE",
    brakingImpact: 5,
    trackReadinessImpact: 5,
    sortOrder: 210,
  },
  {
    code: "brake_pad_ferodo_ds3_12",
    category: "BRAKES",
    brand: "Ferodo Racing",
    name: "Brake Pad",
    variant: "DS3.12",
    componentTypeCode: "brake_pad",
    usageClass: "SPRINT",
    brakingImpact: 6,
    trackReadinessImpact: 5,
    sortOrder: 220,
  },
  {
    code: "brake_pad_ferodo_dsuno",
    category: "BRAKES",
    brand: "Ferodo Racing",
    name: "Brake Pad",
    variant: "DSUNO",
    componentTypeCode: "brake_pad",
    usageClass: "TRACK",
    brakingImpact: 5,
    trackReadinessImpact: 4,
    sortOrder: 230,
  },
  {
    code: "brake_pad_ferodo_ds4_12",
    category: "BRAKES",
    brand: "Ferodo Racing",
    name: "Brake Pad",
    variant: "DS4.12",
    componentTypeCode: "brake_pad",
    usageClass: "SPRINT",
    brakingImpact: 6,
    trackReadinessImpact: 5,
    sortOrder: 240,
  },
  {
    code: "ecu_stage_1",
    category: "ECU",
    name: "ECU Software",
    variant: "Stage 1",
    componentTypeCode: "ecu_software",
    usageClass: "FAST_ROAD",
    active: false,
    sortOrder: 10,
  },
  {
    code: "ecu_stage_2",
    category: "ECU",
    name: "ECU Software",
    variant: "Stage 2",
    componentTypeCode: "ecu_software",
    usageClass: "STREET_TRACK",
    active: false,
    sortOrder: 20,
  },
  {
    code: "engine_rsa300",
    category: "ECU",
    brand: "RSA",
    name: "Platform Tune Package",
    variant: "RSA300",
    componentTypeCode: "platform_tune_package",
    usageClass: "FAST_ROAD",
    active: false,
    sortOrder: 10,
  },
  {
    code: "cooling_intercooler_upgrade",
    category: "COOLING",
    name: "Intercooler",
    variant: "Upgrade",
    componentTypeCode: "intercooler",
    usageClass: "STREET_TRACK",
    active: false,
    sortOrder: 10,
  },
  {
    code: "cooling_oil_cooler",
    category: "COOLING",
    name: "Oil Cooler",
    componentTypeCode: "oil_cooler",
    usageClass: "STREET_TRACK",
    reliabilityImpact: 3,
    trackReadinessImpact: 3,
    sortOrder: 20,
  },
  {
    code: "intake_exhaust_intake",
    category: "INTAKE_EXHAUST",
    name: "Intake",
    componentTypeCode: "intake",
    usageClass: "FAST_ROAD",
    active: false,
    sortOrder: 10,
  },
  {
    code: "intake_exhaust_high_flow_downpipe",
    category: "INTAKE_EXHAUST",
    name: "Downpipe",
    variant: "High-flow",
    componentTypeCode: "downpipe",
    usageClass: "STREET_TRACK",
    active: false,
    sortOrder: 20,
  },
  {
    code: "engine_flex_fuel",
    category: "ENGINE",
    name: "Flex Fuel",
    componentTypeCode: "flex_fuel",
    usageClass: "STREET_TRACK",
    active: false,
    sortOrder: 20,
  },
  {
    code: "engine_turbo_upgrade",
    category: "ENGINE",
    name: "Turbo Upgrade",
    componentTypeCode: "turbo_upgrade",
    usageClass: "TRACK",
    active: false,
    sortOrder: 30,
  },
  {
    code: "tyres_uhp_road",
    category: "TYRES",
    name: "UHP Road Tyre",
    componentTypeCode: "uhp_road_tyre",
    usageClass: "FAST_ROAD",
    handlingImpact: 2,
    brakingImpact: 1,
    trackReadinessImpact: 2,
    sortOrder: 10,
  },
  {
    code: "tyres_semi_slick",
    category: "TYRES",
    name: "Semi-slick",
    componentTypeCode: "semi_slick",
    usageClass: "STREET_TRACK",
    handlingImpact: 6,
    brakingImpact: 3,
    reliabilityImpact: -1,
    trackReadinessImpact: 5,
    sortOrder: 20,
  },
  {
    code: "tyres_slick",
    category: "TYRES",
    name: "Slick",
    componentTypeCode: "slick",
    usageClass: "RACE",
    handlingImpact: 9,
    brakingImpact: 4,
    reliabilityImpact: -2,
    trackReadinessImpact: 5,
    sortOrder: 30,
  },
  {
    code: "wheels_lightweight",
    category: "WHEELS",
    name: "Wheels",
    variant: "Lightweight",
    componentTypeCode: "wheels",
    usageClass: "FAST_ROAD",
    handlingImpact: 2,
    brakingImpact: 1,
    trackReadinessImpact: 1,
    sortOrder: 10,
  },
  {
    code: "drivetrain_aftermarket_lsd",
    category: "DRIVETRAIN",
    name: "LSD",
    variant: "Aftermarket",
    componentTypeCode: "lsd",
    usageClass: "STREET_TRACK",
    active: false,
    sortOrder: 10,
  },
  {
    code: "drivetrain_transmission_software",
    category: "DRIVETRAIN",
    name: "Transmission Software",
    componentTypeCode: "transmission_software",
    usageClass: "FAST_ROAD",
    active: false,
    sortOrder: 20,
  },
  {
    code: "safety_bucket_seat",
    category: "SAFETY",
    name: "Bucket Seat",
    componentTypeCode: "bucket_seat",
    usageClass: "TRACK",
    trackReadinessImpact: 3,
    sortOrder: 10,
  },
  {
    code: "safety_harness",
    category: "SAFETY",
    name: "Harness",
    componentTypeCode: "harness",
    usageClass: "TRACK",
    trackReadinessImpact: 4,
    sortOrder: 20,
  },
  {
    code: "safety_half_cage",
    category: "SAFETY",
    name: "Half Cage",
    componentTypeCode: "half_cage",
    usageClass: "TRACK",
    reliabilityImpact: 1,
    trackReadinessImpact: 4,
    sortOrder: 30,
  },
  {
    code: "safety_full_roll_cage",
    category: "SAFETY",
    name: "Full Roll Cage",
    componentTypeCode: "full_roll_cage",
    usageClass: "RACE",
    reliabilityImpact: 2,
    trackReadinessImpact: 6,
    sortOrder: 40,
  },
] as const;

const coiloverCodes = modificationCatalog
  .filter((item) => item.name === "Coilover")
  .map((item) => item.code);
const brakePadCodes = modificationCatalog
  .filter(
    (item) => "componentTypeCode" in item && item.componentTypeCode === "brake_pad",
  )
  .map((item) => item.code);

const modificationConflictCodePairs = [
  ...coiloverCodes.map((coiloverCode) => [
    "suspension_sport_springs_generic",
    coiloverCode,
  ] as const),
  ...pairwise(coiloverCodes),
  ...pairwise(brakePadCodes),
  ["tyres_uhp_road", "tyres_semi_slick"],
  ["tyres_uhp_road", "tyres_slick"],
  ["tyres_semi_slick", "tyres_slick"],
  ["safety_half_cage", "safety_full_roll_cage"],
] as const;

const modificationRequirementGroups = [
  {
    code: "req_ecu_stage_2_downpipe",
    sourceCode: "ecu_stage_2",
    description: "ECU Stage 2 requires a high-flow downpipe.",
    optionCodes: ["intake_exhaust_high_flow_downpipe"],
    sortOrder: 10,
  },
  {
    code: "req_flex_fuel_ecu",
    sourceCode: "engine_flex_fuel",
    description: "Flex fuel requires ECU Stage 1 or ECU Stage 2.",
    optionCodes: ["ecu_stage_1", "ecu_stage_2"],
    sortOrder: 20,
  },
] as const;

const brakePadSpecifications = [
  brakePadSpec("brake_pad_ebc_redstuff", {
    coldPerformance: 85,
    hotPerformance: 82,
    modulation: 78,
    fadeResistance: 68,
    endurance: 58,
    rotorWear: 25,
    streetSuitability: 88,
    noiseLevel: 25,
    sourceNote:
      "EBC Redstuff official page: fast street pad, low dust, cold bite, no race use.",
  }),
  brakePadSpec("brake_pad_ebc_yellowstuff", {
    coldPerformance: 78,
    hotPerformance: 86,
    modulation: 76,
    fadeResistance: 76,
    endurance: 64,
    rotorWear: 38,
    streetSuitability: 76,
    noiseLevel: 40,
    sourceNote:
      "EBC Yellowstuff official page: fast street pad for emergency stops and fast street driving.",
  }),
  brakePadSpec("brake_pad_ebc_bluestuff_ndx", {
    coldPerformance: 62,
    hotPerformance: 88,
    modulation: 72,
    fadeResistance: 84,
    endurance: 72,
    rotorWear: 55,
    streetSuitability: 50,
    noiseLevel: 58,
    sourceNote:
      "EBC Bluestuff NDX official page: super-street and trackday pad, reformulated in 2021.",
  }),
  brakePadSpec("brake_pad_ebc_rp_x", {
    coldPerformance: 50,
    hotPerformance: 92,
    modulation: 74,
    fadeResistance: 90,
    endurance: 74,
    rotorWear: 70,
    streetSuitability: 30,
    noiseLevel: 76,
    sourceNote:
      "EBC RP-X official page: racing pad for trackday, HPDE, and endurance contexts.",
  }),
  brakePadSpec("brake_pad_ebc_sr11", {
    coldPerformance: 76,
    hotPerformance: 94,
    modulation: 84,
    fadeResistance: 94,
    endurance: 95,
    rotorWear: 35,
    streetSuitability: 22,
    noiseLevel: 82,
    minOperatingTempC: 0,
    maxOperatingTempC: 900,
    sourceNote:
      "EBC SR official page: SR11 medium friction sintered endurance compound, ambient to 900C.",
  }),
  brakePadSpec("brake_pad_ebc_sr21", {
    coldPerformance: 74,
    hotPerformance: 97,
    modulation: 82,
    fadeResistance: 96,
    endurance: 92,
    rotorWear: 38,
    streetSuitability: 18,
    noiseLevel: 86,
    minOperatingTempC: 0,
    maxOperatingTempC: 925,
    sourceNote:
      "EBC SR official page: SR21 ultra-high friction sintered race compound, ambient to 925C.",
  }),
  brakePadSpec("brake_pad_pagid_rsl_1", {
    coldPerformance: 58,
    hotPerformance: 92,
    modulation: 82,
    fadeResistance: 93,
    endurance: 92,
    rotorWear: 52,
    streetSuitability: 28,
    noiseLevel: 76,
    sourceNote:
      "Pagid Racing RSL official literature: endurance racing compound family; exact operating data kept provisional.",
  }),
  brakePadSpec("brake_pad_pagid_rsl_29", {
    coldPerformance: 62,
    hotPerformance: 88,
    modulation: 86,
    fadeResistance: 90,
    endurance: 94,
    rotorWear: 45,
    streetSuitability: 32,
    noiseLevel: 72,
    sourceNote:
      "Pagid Racing RSL 29 official literature: endurance racing compound family; exact operating data kept provisional.",
  }),
  brakePadSpec("brake_pad_ferodo_ds_performance", {
    coldPerformance: 82,
    hotPerformance: 78,
    modulation: 76,
    fadeResistance: 62,
    endurance: 54,
    rotorWear: 32,
    streetSuitability: 84,
    noiseLevel: 32,
    sourceNote:
      "Ferodo Racing official range: DS Performance road-focused performance compound.",
  }),
  brakePadSpec("brake_pad_ferodo_ds2500", {
    coldPerformance: 74,
    hotPerformance: 84,
    modulation: 80,
    fadeResistance: 76,
    endurance: 68,
    rotorWear: 42,
    streetSuitability: 68,
    noiseLevel: 48,
    sourceNote:
      "Ferodo Racing official range: DS2500 hybrid road/track compound.",
  }),
  brakePadSpec("brake_pad_ferodo_ds1_11", {
    coldPerformance: 50,
    hotPerformance: 90,
    modulation: 78,
    fadeResistance: 92,
    endurance: 92,
    rotorWear: 64,
    streetSuitability: 24,
    noiseLevel: 78,
    sourceNote:
      "Ferodo Racing official range: DS1.11 endurance compound; exact operating data kept provisional.",
  }),
  brakePadSpec("brake_pad_ferodo_ds3_12", {
    coldPerformance: 48,
    hotPerformance: 96,
    modulation: 76,
    fadeResistance: 95,
    endurance: 84,
    rotorWear: 72,
    streetSuitability: 18,
    noiseLevel: 84,
    sourceNote:
      "Ferodo Racing official range: DS3.12 high-friction sprint/race compound; exact operating data kept provisional.",
  }),
  brakePadSpec("brake_pad_ferodo_dsuno", {
    coldPerformance: 52,
    hotPerformance: 90,
    modulation: 74,
    fadeResistance: 88,
    endurance: 78,
    rotorWear: 66,
    streetSuitability: 24,
    noiseLevel: 78,
    sourceNote:
      "Ferodo Racing official range: DSUNO race compound; exact operating data kept provisional.",
  }),
  brakePadSpec("brake_pad_ferodo_ds4_12", {
    coldPerformance: 48,
    hotPerformance: 97,
    modulation: 76,
    fadeResistance: 96,
    endurance: 86,
    rotorWear: 74,
    streetSuitability: 16,
    noiseLevel: 86,
    sourceNote:
      "Ferodo Racing official range: DS4.12 high-friction race compound; exact operating data kept provisional.",
  }),
] as const;

const vehicleDefinitions = [
  {
    code: "mazda_mx5_nd_15",
    brand: "Mazda",
    model: "MX-5",
    generation: "ND",
    variant: "1.5",
    yearFrom: 2015,
    powertrain: "ICE",
    drivetrain: "RWD",
    ...calculateVehicleCalibrationScores({
      powerKw: 97,
      torqueNm: 152,
      curbWeightKg: 1030,
      drivetrain: "RWD",
      zeroToHundredSeconds: 8.3,
      sustainedPowerConfidence: 82,
      chassisTrackIntent: 82,
      brakeCapacity: 58,
      brakeRepeatability: 58,
      reliabilityConfidence: 86,
      thermalCapability: 64,
      factoryTrackReadiness: 66,
    }),
    ratingStatus: "CALIBRATED",
    sortOrder: 10,
  },
  {
    code: "mazda_mx5_nd_20",
    brand: "Mazda",
    model: "MX-5",
    generation: "ND",
    variant: "2.0",
    yearFrom: 2015,
    powertrain: "ICE",
    drivetrain: "RWD",
    ...calculateVehicleCalibrationScores({
      powerKw: 135,
      torqueNm: 205,
      curbWeightKg: 1070,
      drivetrain: "RWD",
      zeroToHundredSeconds: 6.5,
      sustainedPowerConfidence: 80,
      chassisTrackIntent: 84,
      brakeCapacity: 61,
      brakeRepeatability: 60,
      reliabilityConfidence: 84,
      thermalCapability: 65,
      factoryTrackReadiness: 68,
    }),
    ratingStatus: "CALIBRATED",
    sortOrder: 20,
  },
  {
    code: "hyundai_i20n",
    brand: "Hyundai",
    model: "i20 N",
    generation: "BC3",
    variant: "1.6 T-GDi",
    yearFrom: 2021,
    powertrain: "ICE",
    drivetrain: "FWD",
    ...calculateVehicleCalibrationScores({
      powerKw: 150,
      torqueNm: 275,
      curbWeightKg: 1190,
      drivetrain: "FWD",
      zeroToHundredSeconds: 6.2,
      sustainedPowerConfidence: 76,
      chassisTrackIntent: 76,
      brakeCapacity: 68,
      brakeRepeatability: 66,
      reliabilityConfidence: 76,
      thermalCapability: 68,
      factoryTrackReadiness: 72,
    }),
    ratingStatus: "CALIBRATED",
    sortOrder: 30,
  },
  {
    code: "hyundai_ioniq_5n",
    brand: "Hyundai",
    model: "Ioniq 5 N",
    generation: "NE",
    variant: "N",
    yearFrom: 2024,
    powertrain: "ELECTRIC",
    drivetrain: "AWD",
    ...calculateVehicleCalibrationScores({
      powerKw: 478,
      torqueNm: 770,
      curbWeightKg: 2275,
      drivetrain: "AWD",
      zeroToHundredSeconds: 3.4,
      sustainedPowerConfidence: 86,
      chassisTrackIntent: 78,
      brakeCapacity: 82,
      brakeRepeatability: 78,
      reliabilityConfidence: 72,
      thermalCapability: 86,
      factoryTrackReadiness: 78,
    }),
    weightPenalty: 8,
    ratingStatus: "CALIBRATED",
    sortOrder: 40,
  },
  {
    code: "bmw_g20_320i_pre_lci",
    brand: "BMW",
    model: "320i",
    generation: "G20",
    chassisCode: "G20",
    variant: "global 2.0 pre-LCI",
    yearFrom: 2019,
    yearTo: 2022,
    powertrain: "ICE",
    drivetrain: "RWD",
    ...calculateVehicleCalibrationScores({
      powerKw: 135,
      torqueNm: 300,
      curbWeightKg: 1525,
      drivetrain: "RWD",
      zeroToHundredSeconds: 7.2,
      sustainedPowerConfidence: 72,
      chassisTrackIntent: 66,
      brakeCapacity: 59,
      brakeRepeatability: 56,
      reliabilityConfidence: 74,
      thermalCapability: 61,
      factoryTrackReadiness: 52,
    }),
    ratingStatus: "PROVISIONAL",
    sortOrder: 50,
  },
  {
    code: "bmw_g20_320i_lci",
    brand: "BMW",
    model: "320i",
    generation: "G20",
    chassisCode: "G20",
    variant: "global 2.0 LCI",
    yearFrom: 2022,
    powertrain: "ICE",
    drivetrain: "RWD",
    ...calculateVehicleCalibrationScores({
      powerKw: 135,
      torqueNm: 300,
      curbWeightKg: 1535,
      drivetrain: "RWD",
      zeroToHundredSeconds: 7.2,
      sustainedPowerConfidence: 72,
      chassisTrackIntent: 67,
      brakeCapacity: 59,
      brakeRepeatability: 57,
      reliabilityConfidence: 74,
      thermalCapability: 62,
      factoryTrackReadiness: 52,
    }),
    ratingStatus: "PROVISIONAL",
    sortOrder: 60,
  },
  {
    code: "bmw_g20_320i_tr_pre_lci",
    brand: "BMW",
    model: "320i",
    generation: "G20",
    chassisCode: "G20",
    variant: "Türkiye 1.6 pre-LCI",
    yearFrom: 2019,
    yearTo: 2022,
    powertrain: "ICE",
    drivetrain: "RWD",
    ...calculateVehicleCalibrationScores({
      powerKw: 125,
      torqueNm: 250,
      curbWeightKg: 1525,
      drivetrain: "RWD",
      zeroToHundredSeconds: 7.7,
      sustainedPowerConfidence: 70,
      chassisTrackIntent: 66,
      brakeCapacity: 59,
      brakeRepeatability: 56,
      reliabilityConfidence: 74,
      thermalCapability: 60,
      factoryTrackReadiness: 52,
    }),
    ratingStatus: "PROVISIONAL",
    sortOrder: 65,
  },
  {
    code: "bmw_g20_320i_tr_lci",
    brand: "BMW",
    model: "320i",
    generation: "G20",
    chassisCode: "G20",
    variant: "Türkiye 1.6 LCI",
    yearFrom: 2022,
    powertrain: "ICE",
    drivetrain: "RWD",
    ...calculateVehicleCalibrationScores({
      powerKw: 125,
      torqueNm: 250,
      curbWeightKg: 1535,
      drivetrain: "RWD",
      zeroToHundredSeconds: 7.7,
      sustainedPowerConfidence: 70,
      chassisTrackIntent: 67,
      brakeCapacity: 59,
      brakeRepeatability: 57,
      reliabilityConfidence: 74,
      thermalCapability: 60,
      factoryTrackReadiness: 52,
    }),
    ratingStatus: "PROVISIONAL",
    sortOrder: 66,
  },
  {
    code: "bmw_g22_420i_pre_lci",
    brand: "BMW",
    model: "420i",
    generation: "G22",
    chassisCode: "G22",
    variant: "global 2.0 pre-LCI",
    yearFrom: 2020,
    yearTo: 2024,
    powertrain: "ICE",
    drivetrain: "RWD",
    ...calculateVehicleCalibrationScores({
      powerKw: 135,
      torqueNm: 300,
      curbWeightKg: 1580,
      drivetrain: "RWD",
      zeroToHundredSeconds: 7.5,
      sustainedPowerConfidence: 72,
      chassisTrackIntent: 66,
      brakeCapacity: 59,
      brakeRepeatability: 56,
      reliabilityConfidence: 74,
      thermalCapability: 61,
      factoryTrackReadiness: 51,
    }),
    ratingStatus: "PROVISIONAL",
    sortOrder: 70,
  },
  {
    code: "bmw_g22_420i_lci",
    brand: "BMW",
    model: "420i",
    generation: "G22",
    chassisCode: "G22",
    variant: "global 2.0 LCI",
    yearFrom: 2024,
    powertrain: "ICE",
    drivetrain: "RWD",
    ...calculateVehicleCalibrationScores({
      powerKw: 135,
      torqueNm: 300,
      curbWeightKg: 1590,
      drivetrain: "RWD",
      zeroToHundredSeconds: 7.5,
      sustainedPowerConfidence: 72,
      chassisTrackIntent: 67,
      brakeCapacity: 59,
      brakeRepeatability: 57,
      reliabilityConfidence: 74,
      thermalCapability: 62,
      factoryTrackReadiness: 51,
    }),
    ratingStatus: "PROVISIONAL",
    sortOrder: 80,
  },
  {
    code: "bmw_g22_420i_tr_pre_lci",
    brand: "BMW",
    model: "420i",
    generation: "G22",
    chassisCode: "G22",
    variant: "Türkiye 1.6 pre-LCI",
    yearFrom: 2020,
    yearTo: 2024,
    powertrain: "ICE",
    drivetrain: "RWD",
    ...calculateVehicleCalibrationScores({
      powerKw: 125,
      torqueNm: 250,
      curbWeightKg: 1600,
      drivetrain: "RWD",
      zeroToHundredSeconds: 8.1,
      sustainedPowerConfidence: 70,
      chassisTrackIntent: 65,
      brakeCapacity: 59,
      brakeRepeatability: 56,
      reliabilityConfidence: 74,
      thermalCapability: 60,
      factoryTrackReadiness: 51,
    }),
    ratingStatus: "PROVISIONAL",
    sortOrder: 85,
  },
  {
    code: "bmw_g22_420i_tr_lci",
    brand: "BMW",
    model: "420i",
    generation: "G22",
    chassisCode: "G22",
    variant: "Türkiye 1.6 LCI",
    yearFrom: 2024,
    powertrain: "ICE",
    drivetrain: "RWD",
    ...calculateVehicleCalibrationScores({
      powerKw: 125,
      torqueNm: 250,
      curbWeightKg: 1610,
      drivetrain: "RWD",
      zeroToHundredSeconds: 8.1,
      sustainedPowerConfidence: 70,
      chassisTrackIntent: 66,
      brakeCapacity: 59,
      brakeRepeatability: 57,
      reliabilityConfidence: 74,
      thermalCapability: 60,
      factoryTrackReadiness: 51,
    }),
    ratingStatus: "PROVISIONAL",
    sortOrder: 86,
  },
  {
    code: "vw_golf_gti_mk85",
    brand: "Volkswagen",
    model: "Golf GTI",
    generation: "Mk8.5",
    yearFrom: 2024,
    powertrain: "ICE",
    drivetrain: "FWD",
    ...calculateVehicleCalibrationScores({
      powerKw: 195,
      torqueNm: 370,
      curbWeightKg: 1460,
      drivetrain: "FWD",
      zeroToHundredSeconds: 5.9,
      sustainedPowerConfidence: 76,
      chassisTrackIntent: 75,
      brakeCapacity: 70,
      brakeRepeatability: 68,
      reliabilityConfidence: 72,
      thermalCapability: 70,
      factoryTrackReadiness: 70,
    }),
    ratingStatus: "PROVISIONAL",
    sortOrder: 90,
  },
  {
    code: "vw_golf_gti_clubsport_mk85",
    brand: "Volkswagen",
    model: "Golf GTI Clubsport",
    generation: "Mk8.5",
    yearFrom: 2024,
    powertrain: "ICE",
    drivetrain: "FWD",
    ...calculateVehicleCalibrationScores({
      powerKw: 221,
      torqueNm: 400,
      curbWeightKg: 1460,
      drivetrain: "FWD",
      zeroToHundredSeconds: 5.6,
      sustainedPowerConfidence: 78,
      chassisTrackIntent: 79,
      brakeCapacity: 73,
      brakeRepeatability: 72,
      reliabilityConfidence: 71,
      thermalCapability: 72,
      factoryTrackReadiness: 75,
    }),
    ratingStatus: "PROVISIONAL",
    sortOrder: 100,
  },
  {
    code: "vw_golf_r_mk85",
    brand: "Volkswagen",
    model: "Golf R",
    generation: "Mk8.5",
    yearFrom: 2024,
    powertrain: "ICE",
    drivetrain: "AWD",
    ...calculateVehicleCalibrationScores({
      powerKw: 245,
      torqueNm: 420,
      curbWeightKg: 1550,
      drivetrain: "AWD",
      zeroToHundredSeconds: 4.6,
      sustainedPowerConfidence: 79,
      chassisTrackIntent: 78,
      brakeCapacity: 74,
      brakeRepeatability: 72,
      reliabilityConfidence: 70,
      thermalCapability: 73,
      factoryTrackReadiness: 75,
    }),
    ratingStatus: "PROVISIONAL",
    sortOrder: 110,
  },
  {
    code: "honda_civic_type_r_fk2",
    brand: "Honda",
    model: "Civic Type R",
    generation: "FK2",
    yearFrom: 2015,
    yearTo: 2017,
    powertrain: "ICE",
    drivetrain: "FWD",
    ...calculateVehicleCalibrationScores({
      powerKw: 228,
      torqueNm: 400,
      curbWeightKg: 1382,
      drivetrain: "FWD",
      zeroToHundredSeconds: 5.7,
      sustainedPowerConfidence: 78,
      chassisTrackIntent: 80,
      brakeCapacity: 78,
      brakeRepeatability: 74,
      reliabilityConfidence: 75,
      thermalCapability: 72,
      factoryTrackReadiness: 78,
    }),
    ratingStatus: "PROVISIONAL",
    sortOrder: 120,
  },
  {
    code: "honda_civic_type_r_fk8",
    brand: "Honda",
    model: "Civic Type R",
    generation: "FK8",
    yearFrom: 2017,
    yearTo: 2022,
    powertrain: "ICE",
    drivetrain: "FWD",
    ...calculateVehicleCalibrationScores({
      powerKw: 235,
      torqueNm: 400,
      curbWeightKg: 1390,
      drivetrain: "FWD",
      zeroToHundredSeconds: 5.7,
      sustainedPowerConfidence: 80,
      chassisTrackIntent: 86,
      brakeCapacity: 80,
      brakeRepeatability: 78,
      reliabilityConfidence: 76,
      thermalCapability: 76,
      factoryTrackReadiness: 84,
    }),
    ratingStatus: "CALIBRATED",
    sortOrder: 130,
  },
  {
    code: "honda_civic_type_r_fl5",
    brand: "Honda",
    model: "Civic Type R",
    generation: "FL5",
    yearFrom: 2023,
    powertrain: "ICE",
    drivetrain: "FWD",
    ...calculateVehicleCalibrationScores({
      powerKw: 242,
      torqueNm: 420,
      curbWeightKg: 1430,
      drivetrain: "FWD",
      zeroToHundredSeconds: 5.4,
      sustainedPowerConfidence: 82,
      chassisTrackIntent: 88,
      brakeCapacity: 82,
      brakeRepeatability: 80,
      reliabilityConfidence: 77,
      thermalCapability: 78,
      factoryTrackReadiness: 86,
    }),
    ratingStatus: "CALIBRATED",
    sortOrder: 140,
  },
  {
    code: "tesla_model_y_rwd",
    brand: "Tesla",
    model: "Model Y",
    variant: "RWD",
    yearFrom: 2020,
    powertrain: "ELECTRIC",
    drivetrain: "RWD",
    ...calculateVehicleCalibrationScores({
      powerKw: 220,
      torqueNm: 420,
      curbWeightKg: 1909,
      drivetrain: "RWD",
      zeroToHundredSeconds: 6.9,
      sustainedPowerConfidence: 66,
      chassisTrackIntent: 56,
      brakeCapacity: 58,
      brakeRepeatability: 52,
      reliabilityConfidence: 66,
      thermalCapability: 56,
      factoryTrackReadiness: 38,
    }),
    weightPenalty: 7,
    ratingStatus: "PROVISIONAL",
    sortOrder: 150,
  },
  {
    code: "tesla_model_y_long_range_awd",
    brand: "Tesla",
    model: "Model Y",
    variant: "Long Range AWD",
    yearFrom: 2020,
    powertrain: "ELECTRIC",
    drivetrain: "AWD",
    ...calculateVehicleCalibrationScores({
      powerKw: 378,
      torqueNm: 493,
      curbWeightKg: 1980,
      drivetrain: "AWD",
      zeroToHundredSeconds: 5.0,
      sustainedPowerConfidence: 68,
      chassisTrackIntent: 58,
      brakeCapacity: 60,
      brakeRepeatability: 54,
      reliabilityConfidence: 66,
      thermalCapability: 58,
      factoryTrackReadiness: 40,
    }),
    weightPenalty: 8,
    ratingStatus: "PROVISIONAL",
    sortOrder: 160,
  },
  {
    code: "tesla_model_y_performance",
    brand: "Tesla",
    model: "Model Y",
    variant: "Performance",
    yearFrom: 2020,
    powertrain: "ELECTRIC",
    drivetrain: "AWD",
    ...calculateVehicleCalibrationScores({
      powerKw: 393,
      torqueNm: 660,
      curbWeightKg: 1995,
      drivetrain: "AWD",
      zeroToHundredSeconds: 3.7,
      sustainedPowerConfidence: 68,
      chassisTrackIntent: 62,
      brakeCapacity: 64,
      brakeRepeatability: 56,
      reliabilityConfidence: 65,
      thermalCapability: 60,
      factoryTrackReadiness: 44,
    }),
    weightPenalty: 8,
    ratingStatus: "PROVISIONAL",
    sortOrder: 170,
  },
  {
    code: "togg_t10x_rwd",
    brand: "Togg",
    model: "T10X",
    variant: "RWD",
    yearFrom: 2023,
    powertrain: "ELECTRIC",
    drivetrain: "RWD",
    ...calculateVehicleCalibrationScores({
      powerKw: 160,
      torqueNm: 350,
      curbWeightKg: 2126,
      drivetrain: "RWD",
      zeroToHundredSeconds: 7.4,
      sustainedPowerConfidence: 58,
      chassisTrackIntent: 46,
      brakeCapacity: 50,
      brakeRepeatability: 44,
      reliabilityConfidence: 62,
      thermalCapability: 50,
      factoryTrackReadiness: 30,
    }),
    weightPenalty: 7,
    ratingStatus: "PROVISIONAL",
    sortOrder: 180,
  },
  {
    code: "togg_t10x_awd",
    brand: "Togg",
    model: "T10X",
    variant: "AWD",
    yearFrom: 2024,
    powertrain: "ELECTRIC",
    drivetrain: "AWD",
    ...calculateVehicleCalibrationScores({
      powerKw: 320,
      torqueNm: 700,
      curbWeightKg: 2235,
      drivetrain: "AWD",
      zeroToHundredSeconds: 4.8,
      sustainedPowerConfidence: 58,
      chassisTrackIntent: 48,
      brakeCapacity: 52,
      brakeRepeatability: 45,
      reliabilityConfidence: 62,
      thermalCapability: 51,
      factoryTrackReadiness: 32,
    }),
    weightPenalty: 8,
    ratingStatus: "PROVISIONAL",
    sortOrder: 190,
  },
] as const;

const bmwGlobalB48Codes = [
  "bmw_g20_320i_pre_lci",
  "bmw_g20_320i_lci",
  "bmw_g22_420i_pre_lci",
  "bmw_g22_420i_lci",
] as const;
const bmwTurkeyB48Codes = [
  "bmw_g20_320i_tr_pre_lci",
  "bmw_g20_320i_tr_lci",
  "bmw_g22_420i_tr_pre_lci",
  "bmw_g22_420i_tr_lci",
] as const;
const bmwB48Codes = [...bmwGlobalB48Codes, ...bmwTurkeyB48Codes] as const;
const turboIceCodes = [
  "hyundai_i20n",
  ...bmwB48Codes,
  "vw_golf_gti_mk85",
  "vw_golf_gti_clubsport_mk85",
  "vw_golf_r_mk85",
  "honda_civic_type_r_fk2",
  "honda_civic_type_r_fk8",
  "honda_civic_type_r_fl5",
] as const;
const dsgAutomaticCodes = [
  ...bmwB48Codes,
  "vw_golf_gti_mk85",
  "vw_golf_gti_clubsport_mk85",
  "vw_golf_r_mk85",
] as const;
const lsdSupportedCodes = [
  "mazda_mx5_nd_15",
  "mazda_mx5_nd_20",
  ...bmwB48Codes,
  "vw_golf_gti_mk85",
  "vw_golf_gti_clubsport_mk85",
] as const;

const platformModificationCompatibilities = [
  ...bmwTurkeyB48Codes.map((vehicleCode) => ({
    modificationCode: "engine_rsa300",
    vehicleCode,
  })),
  ...turboIceCodes.flatMap((vehicleCode) => [
    { modificationCode: "ecu_stage_1", vehicleCode },
    { modificationCode: "ecu_stage_2", vehicleCode },
    { modificationCode: "engine_flex_fuel", vehicleCode },
    { modificationCode: "cooling_intercooler_upgrade", vehicleCode },
    { modificationCode: "intake_exhaust_intake", vehicleCode },
    { modificationCode: "intake_exhaust_high_flow_downpipe", vehicleCode },
    { modificationCode: "engine_turbo_upgrade", vehicleCode },
  ]),
  ...dsgAutomaticCodes.map((vehicleCode) => ({
    modificationCode: "drivetrain_transmission_software",
    vehicleCode,
  })),
  ...lsdSupportedCodes.map((vehicleCode) => ({
    modificationCode: "drivetrain_aftermarket_lsd",
    vehicleCode,
  })),
] as const;

const platformModificationImpacts = [
  ...bmwTurkeyB48Codes.map((vehicleCode) =>
    impact(vehicleCode, "engine_rsa300", {
      powerImpact: 16,
      reliabilityImpact: -3,
      thermalImpact: -4,
    }),
  ),
  ...bmwB48Codes.flatMap((vehicleCode) => [
    impact(vehicleCode, "ecu_stage_1", { powerImpact: 8, reliabilityImpact: -1, thermalImpact: -1 }),
    impact(vehicleCode, "ecu_stage_2", { powerImpact: 13, reliabilityImpact: -2, thermalImpact: -2, trackReadinessImpact: 1 }),
    impact(vehicleCode, "cooling_intercooler_upgrade", { reliabilityImpact: 2, thermalImpact: 5, trackReadinessImpact: 3 }),
    impact(vehicleCode, "intake_exhaust_intake", { powerImpact: 2 }),
    impact(vehicleCode, "intake_exhaust_high_flow_downpipe", { powerImpact: 3, thermalImpact: 1 }),
    impact(vehicleCode, "engine_turbo_upgrade", { powerImpact: 22, reliabilityImpact: -5, thermalImpact: -4 }),
    impact(vehicleCode, "drivetrain_transmission_software", { powerImpact: 2, trackReadinessImpact: 2 }),
    impact(vehicleCode, "drivetrain_aftermarket_lsd", { handlingImpact: 5, trackReadinessImpact: 4 }),
  ]),
  ...["hyundai_i20n", "vw_golf_gti_mk85", "vw_golf_gti_clubsport_mk85", "vw_golf_r_mk85", "honda_civic_type_r_fk2", "honda_civic_type_r_fk8", "honda_civic_type_r_fl5"].flatMap((vehicleCode) => [
    impact(vehicleCode, "ecu_stage_1", { powerImpact: 7, reliabilityImpact: -1, thermalImpact: -1 }),
    impact(vehicleCode, "ecu_stage_2", { powerImpact: 12, reliabilityImpact: -2, thermalImpact: -2, trackReadinessImpact: 1 }),
    impact(vehicleCode, "engine_flex_fuel", { powerImpact: 4, reliabilityImpact: -1 }),
    impact(vehicleCode, "cooling_intercooler_upgrade", { reliabilityImpact: 2, thermalImpact: 5, trackReadinessImpact: 3 }),
    impact(vehicleCode, "intake_exhaust_intake", { powerImpact: 2 }),
    impact(vehicleCode, "intake_exhaust_high_flow_downpipe", { powerImpact: 3, thermalImpact: 1 }),
    impact(vehicleCode, "engine_turbo_upgrade", { powerImpact: 20, reliabilityImpact: -5, thermalImpact: -4 }),
  ]),
  ...dsgAutomaticCodes.map((vehicleCode) =>
    impact(vehicleCode, "drivetrain_transmission_software", { powerImpact: 2, trackReadinessImpact: 2 }),
  ),
  ...["mazda_mx5_nd_15", "mazda_mx5_nd_20"].flatMap((vehicleCode) => [
    impact(vehicleCode, "drivetrain_aftermarket_lsd", { handlingImpact: 6, trackReadinessImpact: 5 }),
    impact(vehicleCode, "suspension_coilover_kw_v3", { handlingImpact: 8, trackReadinessImpact: 6 }),
  ]),
  impact("honda_civic_type_r_fl5", "suspension_coilover_kw_v3", {
    handlingImpact: 7,
    trackReadinessImpact: 6,
  }),
] as const;

function impact(
  vehicleCode: string,
  modificationCode: string,
  values: {
    powerImpact?: number;
    handlingImpact?: number;
    brakingImpact?: number;
    reliabilityImpact?: number;
    thermalImpact?: number;
    trackReadinessImpact?: number;
  },
) {
  return {
    vehicleCode,
    modificationCode,
    ...values,
  };
}

type BrakePadSpecSeed = {
  modificationCode: string;
  coldPerformance: number;
  hotPerformance: number;
  modulation: number;
  fadeResistance: number;
  endurance: number;
  rotorWear: number;
  streetSuitability: number;
  noiseLevel: number;
  minOperatingTempC?: number;
  maxOperatingTempC?: number;
  sourceNote?: string;
};

function brakePadSpec(
  modificationCode: string,
  values: Omit<BrakePadSpecSeed, "modificationCode">,
): BrakePadSpecSeed {
  return {
    modificationCode,
    ...values,
  };
}

function clampCatalogScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function decimalFromEnv(name: string): Prisma.Decimal {
  return new Prisma.Decimal(process.env[name] ?? "0.00");
}

function intFromEnv(name: string): number {
  const parsed = Number.parseInt(process.env[name] ?? "0", 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function main() {
  const event = await prisma.event.upsert({
    where: { slug: eventSlug },
    update: {
      code: "KULA",
      name: "Kula MyTrack",
      venue: "Kula MyTrack",
      startsAt: new Date("2026-09-20T06:00:00+03:00"),
      endsAt: new Date("2026-09-20T18:00:00+03:00"),
      timezone: "Europe/Istanbul",
      status: "PUBLISHED",
    },
    create: {
      code: "KULA",
      slug: eventSlug,
      name: "Kula MyTrack",
      venue: "Kula MyTrack",
      startsAt: new Date("2026-09-20T06:00:00+03:00"),
      endsAt: new Date("2026-09-20T18:00:00+03:00"),
      timezone: "Europe/Istanbul",
      status: "PUBLISHED",
      participantSequenceNext: 1,
    },
  });

  await prisma.eventPackageDay.deleteMany({
    where: {
      package: {
        eventId: event.id,
        code: { not: "SEP20" },
      },
    },
  });

  await prisma.eventPackage.deleteMany({
    where: {
      eventId: event.id,
      code: { not: "SEP20" },
    },
  });

  await prisma.eventDay.deleteMany({
    where: {
      eventId: event.id,
      date: { not: sep20 },
    },
  });

  const day20 = await prisma.eventDay.upsert({
    where: { eventId_date: { eventId: event.id, date: sep20 } },
    update: { label: "Sunday, 20 September 2026" },
    create: {
      eventId: event.id,
      date: sep20,
      label: "Sunday, 20 September 2026",
    },
  });

  const package20 = await prisma.eventPackage.upsert({
    where: { eventId_code: { eventId: event.id, code: "SEP20" } },
    update: {
      name: "Sunday Track Day",
      price: decimalFromEnv("SEED_PACKAGE_SEP20_PRICE"),
      capacity: intFromEnv("SEED_PACKAGE_SEP20_CAPACITY"),
      active: true,
    },
    create: {
      eventId: event.id,
      code: "SEP20",
      name: "Sunday Track Day",
      price: decimalFromEnv("SEED_PACKAGE_SEP20_PRICE"),
      currency: "TRY",
      capacity: intFromEnv("SEED_PACKAGE_SEP20_CAPACITY"),
      active: true,
    },
  });

  const links = [{ packageId: package20.id, eventDayId: day20.id }];

  for (const link of links) {
    await prisma.eventPackageDay.upsert({
      where: { packageId_eventDayId: link },
      update: {},
      create: link,
    });
  }

  const definitionsByCode = await seedModificationCatalog();
  await seedBrakePadSpecifications(definitionsByCode);
  await seedModificationConflicts(definitionsByCode);
  await seedModificationRequirements(definitionsByCode);
  const vehicleDefinitionsByCode = await seedVehicleDefinitions();
  await seedPlatformCompatibilities(definitionsByCode, vehicleDefinitionsByCode);
  await seedPlatformImpacts(definitionsByCode, vehicleDefinitionsByCode);
  await reactivatePlatformDefinitions(definitionsByCode);

  console.log(`Seeded ${event.name} with ${links.length} package-day links.`);
  console.log(`Seeded ${modificationCatalog.length} modification definitions.`);
  console.log(`Seeded ${vehicleDefinitions.length} vehicle definitions.`);
}

async function seedModificationCatalog() {
  const definitionsByCode = new Map<string, { id: string }>();

  for (const item of modificationCatalog) {
    const optionalItem = item as typeof item &
      Partial<{
        brand: string;
        variant: string;
        componentTypeCode: string;
        usageClass: ModificationUsageClass;
        active: boolean;
        powerImpact: number;
        handlingImpact: number;
        brakingImpact: number;
        reliabilityImpact: number;
        trackReadinessImpact: number;
      }>;
    const definition = await prisma.modificationDefinition.upsert({
      where: { code: item.code },
      update: {
        category: item.category,
        brand: optionalItem.brand ?? null,
        name: item.name,
        variant: optionalItem.variant ?? null,
        componentTypeCode: optionalItem.componentTypeCode ?? null,
        usageClass: optionalItem.usageClass ?? null,
        description: null,
        powerImpact: optionalItem.powerImpact ?? 0,
        handlingImpact: optionalItem.handlingImpact ?? 0,
        brakingImpact: optionalItem.brakingImpact ?? 0,
        reliabilityImpact: optionalItem.reliabilityImpact ?? 0,
        trackReadinessImpact: optionalItem.trackReadinessImpact ?? 0,
        active: optionalItem.active ?? true,
        sortOrder: item.sortOrder,
      },
      create: {
        code: item.code,
        category: item.category,
        brand: optionalItem.brand ?? null,
        name: item.name,
        variant: optionalItem.variant ?? null,
        componentTypeCode: optionalItem.componentTypeCode ?? null,
        usageClass: optionalItem.usageClass ?? null,
        description: null,
        powerImpact: optionalItem.powerImpact ?? 0,
        handlingImpact: optionalItem.handlingImpact ?? 0,
        brakingImpact: optionalItem.brakingImpact ?? 0,
        reliabilityImpact: optionalItem.reliabilityImpact ?? 0,
        trackReadinessImpact: optionalItem.trackReadinessImpact ?? 0,
        active: optionalItem.active ?? true,
        sortOrder: item.sortOrder,
      },
      select: {
        id: true,
      },
    });

    definitionsByCode.set(item.code, definition);
  }

  return definitionsByCode;
}

async function seedVehicleDefinitions() {
  const vehicleDefinitionsByCode = new Map<string, { id: string }>();

  for (const item of vehicleDefinitions) {
    const optionalItem = item as typeof item &
      Partial<{
        generation: string;
        chassisCode: string;
        variant: string;
        yearFrom: number;
        yearTo: number;
        weightPenalty: number;
      }>;
    const definition = await prisma.vehicleDefinition.upsert({
      where: {
        code: item.code,
      },
      update: {
        brand: item.brand,
        model: item.model,
        generation: optionalItem.generation ?? null,
        chassisCode: optionalItem.chassisCode ?? null,
        variant: optionalItem.variant ?? null,
        yearFrom: optionalItem.yearFrom ?? null,
        yearTo: optionalItem.yearTo ?? null,
        powertrain: item.powertrain,
        drivetrain: item.drivetrain,
        powerRating: item.powerRating,
        handlingRating: item.handlingRating,
        brakingRating: item.brakingRating,
        reliabilityRating: item.reliabilityRating,
        thermalRating: item.thermalRating,
        trackReadinessRating: item.trackReadinessRating,
        weightPenalty: optionalItem.weightPenalty ?? 0,
        ratingStatus: item.ratingStatus,
        active: true,
        sortOrder: item.sortOrder,
      },
      create: {
        code: item.code,
        brand: item.brand,
        model: item.model,
        generation: optionalItem.generation ?? null,
        chassisCode: optionalItem.chassisCode ?? null,
        variant: optionalItem.variant ?? null,
        yearFrom: optionalItem.yearFrom ?? null,
        yearTo: optionalItem.yearTo ?? null,
        powertrain: item.powertrain,
        drivetrain: item.drivetrain,
        powerRating: item.powerRating,
        handlingRating: item.handlingRating,
        brakingRating: item.brakingRating,
        reliabilityRating: item.reliabilityRating,
        thermalRating: item.thermalRating,
        trackReadinessRating: item.trackReadinessRating,
        weightPenalty: optionalItem.weightPenalty ?? 0,
        ratingStatus: item.ratingStatus,
        active: true,
        sortOrder: item.sortOrder,
      },
      select: {
        id: true,
      },
    });

    vehicleDefinitionsByCode.set(item.code, definition);
  }

  return vehicleDefinitionsByCode;
}

async function seedBrakePadSpecifications(
  definitionsByCode: Map<string, { id: string }>,
) {
  const activeBrakePadDefinitionIds = new Set<string>();

  for (const spec of brakePadSpecifications) {
    const modificationDefinition = definitionsByCode.get(spec.modificationCode);

    if (!modificationDefinition) {
      throw new Error(
        `Missing modification definition for brake pad specification ${spec.modificationCode}`,
      );
    }

    activeBrakePadDefinitionIds.add(modificationDefinition.id);

    await prisma.brakePadSpecification.upsert({
      where: {
        modificationDefinitionId: modificationDefinition.id,
      },
      update: {
        coldPerformance: clampCatalogScore(spec.coldPerformance),
        hotPerformance: clampCatalogScore(spec.hotPerformance),
        modulation: clampCatalogScore(spec.modulation),
        fadeResistance: clampCatalogScore(spec.fadeResistance),
        endurance: clampCatalogScore(spec.endurance),
        rotorWear: clampCatalogScore(spec.rotorWear),
        streetSuitability: clampCatalogScore(spec.streetSuitability),
        noiseLevel: clampCatalogScore(spec.noiseLevel),
        minOperatingTempC: spec.minOperatingTempC ?? null,
        maxOperatingTempC: spec.maxOperatingTempC ?? null,
        sourceNote: spec.sourceNote ?? null,
        active: true,
      },
      create: {
        modificationDefinitionId: modificationDefinition.id,
        coldPerformance: clampCatalogScore(spec.coldPerformance),
        hotPerformance: clampCatalogScore(spec.hotPerformance),
        modulation: clampCatalogScore(spec.modulation),
        fadeResistance: clampCatalogScore(spec.fadeResistance),
        endurance: clampCatalogScore(spec.endurance),
        rotorWear: clampCatalogScore(spec.rotorWear),
        streetSuitability: clampCatalogScore(spec.streetSuitability),
        noiseLevel: clampCatalogScore(spec.noiseLevel),
        minOperatingTempC: spec.minOperatingTempC ?? null,
        maxOperatingTempC: spec.maxOperatingTempC ?? null,
        sourceNote: spec.sourceNote ?? null,
        active: true,
      },
    });
  }

  await prisma.brakePadSpecification.updateMany({
    where: {
      modificationDefinitionId: {
        notIn: [...activeBrakePadDefinitionIds],
      },
    },
    data: {
      active: false,
    },
  });
}

async function seedPlatformCompatibilities(
  definitionsByCode: Map<string, { id: string }>,
  vehicleDefinitionsByCode: Map<string, { id: string }>,
) {
  const activeVehicleIdsByDefinitionId = new Map<string, Set<string>>();

  for (const compatibility of platformModificationCompatibilities) {
    const modificationDefinition = definitionsByCode.get(compatibility.modificationCode);
    const vehicleDefinition = vehicleDefinitionsByCode.get(compatibility.vehicleCode);

    if (!modificationDefinition || !vehicleDefinition) {
      throw new Error(
        `Missing definition for platform compatibility ${compatibility.modificationCode}:${compatibility.vehicleCode}`,
      );
    }

    const activeVehicleIds =
      activeVehicleIdsByDefinitionId.get(modificationDefinition.id) ?? new Set<string>();

    activeVehicleIds.add(vehicleDefinition.id);
    activeVehicleIdsByDefinitionId.set(modificationDefinition.id, activeVehicleIds);

    await prisma.modificationCompatibility.upsert({
      where: {
        modificationDefinitionId_vehicleDefinitionId: {
          modificationDefinitionId: modificationDefinition.id,
          vehicleDefinitionId: vehicleDefinition.id,
        },
      },
      update: {
        vehicleBrand: null,
        vehicleModel: null,
        yearFrom: null,
        yearTo: null,
        active: true,
      },
      create: {
        modificationDefinitionId: modificationDefinition.id,
        vehicleDefinitionId: vehicleDefinition.id,
        active: true,
      },
    });
  }

  for (const [
    modificationDefinitionId,
    activeVehicleDefinitionIds,
  ] of activeVehicleIdsByDefinitionId) {
    await prisma.modificationCompatibility.updateMany({
      where: {
        modificationDefinitionId,
        active: true,
        OR: [
          {
            vehicleDefinitionId: {
              notIn: [...activeVehicleDefinitionIds],
            },
          },
          {
            vehicleDefinitionId: null,
          },
        ],
      },
      data: {
        active: false,
      },
    });
  }
}

async function seedPlatformImpacts(
  definitionsByCode: Map<string, { id: string }>,
  vehicleDefinitionsByCode: Map<string, { id: string }>,
) {
  const activeVehicleIdsByDefinitionId = new Map<string, Set<string>>();

  for (const impactValue of platformModificationImpacts) {
    const modificationDefinition = definitionsByCode.get(impactValue.modificationCode);
    const vehicleDefinition = vehicleDefinitionsByCode.get(impactValue.vehicleCode);

    if (!modificationDefinition || !vehicleDefinition) {
      throw new Error(
        `Missing definition for platform impact ${impactValue.modificationCode}:${impactValue.vehicleCode}`,
      );
    }

    const activeVehicleIds =
      activeVehicleIdsByDefinitionId.get(modificationDefinition.id) ?? new Set<string>();

    activeVehicleIds.add(vehicleDefinition.id);
    activeVehicleIdsByDefinitionId.set(modificationDefinition.id, activeVehicleIds);

    await prisma.vehicleModificationImpact.upsert({
      where: {
        vehicleDefinitionId_modificationDefinitionId: {
          vehicleDefinitionId: vehicleDefinition.id,
          modificationDefinitionId: modificationDefinition.id,
        },
      },
      update: {
        powerImpact: impactValue.powerImpact ?? 0,
        handlingImpact: impactValue.handlingImpact ?? 0,
        brakingImpact: impactValue.brakingImpact ?? 0,
        reliabilityImpact: impactValue.reliabilityImpact ?? 0,
        thermalImpact: impactValue.thermalImpact ?? 0,
        trackReadinessImpact: impactValue.trackReadinessImpact ?? 0,
        active: true,
      },
      create: {
        vehicleDefinitionId: vehicleDefinition.id,
        modificationDefinitionId: modificationDefinition.id,
        powerImpact: impactValue.powerImpact ?? 0,
        handlingImpact: impactValue.handlingImpact ?? 0,
        brakingImpact: impactValue.brakingImpact ?? 0,
        reliabilityImpact: impactValue.reliabilityImpact ?? 0,
        thermalImpact: impactValue.thermalImpact ?? 0,
        trackReadinessImpact: impactValue.trackReadinessImpact ?? 0,
        active: true,
      },
    });
  }

  for (const [
    modificationDefinitionId,
    activeVehicleDefinitionIds,
  ] of activeVehicleIdsByDefinitionId) {
    await prisma.vehicleModificationImpact.updateMany({
      where: {
        modificationDefinitionId,
        active: true,
        vehicleDefinitionId: {
          notIn: [...activeVehicleDefinitionIds],
        },
      },
      data: {
        active: false,
      },
    });
  }
}

async function reactivatePlatformDefinitions(
  definitionsByCode: Map<string, { id: string }>,
) {
  const compatibleModificationCodes = new Set(
    platformModificationCompatibilities.map(
      (compatibility) => compatibility.modificationCode,
    ),
  );

  for (const modificationCode of compatibleModificationCodes) {
    const definition = definitionsByCode.get(modificationCode);

    if (!definition) {
      throw new Error(`Missing modification definition ${modificationCode}`);
    }

    await prisma.modificationDefinition.update({
      where: {
        id: definition.id,
      },
      data: {
        active: true,
      },
    });
  }
}

async function seedModificationConflicts(
  definitionsByCode: Map<string, { id: string }>,
) {
  for (const [sourceCode, targetCode] of modificationConflictCodePairs) {
    const sourceDefinition = definitionsByCode.get(sourceCode);
    const targetDefinition = definitionsByCode.get(targetCode);

    if (!sourceDefinition || !targetDefinition) {
      throw new Error(`Missing modification definition for conflict ${sourceCode}:${targetCode}`);
    }

    await prisma.modificationRule.upsert({
      where: {
        sourceDefinitionId_targetDefinitionId_ruleType: {
          sourceDefinitionId: sourceDefinition.id,
          targetDefinitionId: targetDefinition.id,
          ruleType: "CONFLICTS_WITH",
        },
      },
      update: {
        active: true,
      },
      create: {
        sourceDefinitionId: sourceDefinition.id,
        targetDefinitionId: targetDefinition.id,
        ruleType: "CONFLICTS_WITH",
        active: true,
      },
    });
  }
}

async function seedModificationRequirements(
  definitionsByCode: Map<string, { id: string }>,
) {
  for (const group of modificationRequirementGroups) {
    const sourceDefinition = definitionsByCode.get(group.sourceCode);

    if (!sourceDefinition) {
      throw new Error(`Missing modification definition for requirement ${group.code}`);
    }

    const requirementGroup = await prisma.modificationRequirementGroup.upsert({
      where: {
        code: group.code,
      },
      update: {
        sourceDefinitionId: sourceDefinition.id,
        description: group.description,
        active: true,
        sortOrder: group.sortOrder,
      },
      create: {
        code: group.code,
        sourceDefinitionId: sourceDefinition.id,
        description: group.description,
        active: true,
        sortOrder: group.sortOrder,
      },
      select: {
        id: true,
      },
    });

    const activeRequiredIds = new Set<string>();

    for (const optionCode of group.optionCodes) {
      const requiredDefinition = definitionsByCode.get(optionCode);

      if (!requiredDefinition) {
        throw new Error(`Missing modification definition for requirement option ${optionCode}`);
      }

      activeRequiredIds.add(requiredDefinition.id);

      await prisma.modificationRequirementOption.upsert({
        where: {
          requirementGroupId_requiredDefinitionId: {
            requirementGroupId: requirementGroup.id,
            requiredDefinitionId: requiredDefinition.id,
          },
        },
        update: {},
        create: {
          requirementGroupId: requirementGroup.id,
          requiredDefinitionId: requiredDefinition.id,
        },
      });
    }

    await prisma.modificationRequirementOption.deleteMany({
      where: {
        requirementGroupId: requirementGroup.id,
        requiredDefinitionId: {
          notIn: [...activeRequiredIds],
        },
      },
    });
  }
}

function pairwise<T>(items: readonly T[]) {
  const pairs: Array<readonly [T, T]> = [];

  for (let sourceIndex = 0; sourceIndex < items.length; sourceIndex += 1) {
    for (let targetIndex = sourceIndex + 1; targetIndex < items.length; targetIndex += 1) {
      pairs.push([items[sourceIndex], items[targetIndex]]);
    }
  }

  return pairs;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
