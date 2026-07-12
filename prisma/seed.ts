import { Prisma, PrismaClient } from "@prisma/client";

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
    handlingImpact: 2,
    trackReadinessImpact: 1,
    sortOrder: 10,
  },
  {
    code: "suspension_coilover_jom",
    category: "SUSPENSION",
    brand: "JOM",
    name: "Coilover",
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
    handlingImpact: 8,
    reliabilityImpact: -1,
    trackReadinessImpact: 7,
    sortOrder: 100,
  },
  {
    code: "suspension_adjustable_front_camber_hardware",
    category: "SUSPENSION",
    name: "Adjustable front camber hardware",
    handlingImpact: 3,
    trackReadinessImpact: 2,
    sortOrder: 110,
  },
  {
    code: "suspension_rear_anti_roll_bar",
    category: "SUSPENSION",
    name: "Rear anti-roll bar",
    handlingImpact: 2,
    trackReadinessImpact: 1,
    sortOrder: 120,
  },
  {
    code: "brakes_performance_pads",
    category: "BRAKES",
    name: "Performance brake pads",
    brakingImpact: 3,
    trackReadinessImpact: 2,
    sortOrder: 10,
  },
  {
    code: "brakes_track_pads",
    category: "BRAKES",
    name: "Track brake pads",
    brakingImpact: 6,
    reliabilityImpact: -1,
    trackReadinessImpact: 5,
    sortOrder: 20,
  },
  {
    code: "brakes_braided_lines",
    category: "BRAKES",
    name: "Braided brake lines",
    brakingImpact: 2,
    trackReadinessImpact: 2,
    sortOrder: 30,
  },
  {
    code: "brakes_high_temperature_fluid",
    category: "BRAKES",
    name: "High-temperature brake fluid",
    brakingImpact: 3,
    trackReadinessImpact: 4,
    sortOrder: 40,
  },
  {
    code: "brakes_big_brake_kit",
    category: "BRAKES",
    name: "Big Brake Kit",
    brakingImpact: 8,
    trackReadinessImpact: 6,
    sortOrder: 50,
  },
  {
    code: "brakes_cooling_ducts",
    category: "BRAKES",
    name: "Brake cooling ducts",
    brakingImpact: 2,
    reliabilityImpact: 1,
    trackReadinessImpact: 3,
    sortOrder: 60,
  },
  {
    code: "ecu_stage_1",
    category: "ECU",
    name: "ECU Stage 1",
    active: false,
    sortOrder: 10,
  },
  {
    code: "ecu_stage_2",
    category: "ECU",
    name: "ECU Stage 2",
    active: false,
    sortOrder: 20,
  },
  {
    code: "engine_rsa300",
    category: "ENGINE",
    name: "RSA300",
    active: false,
    sortOrder: 10,
  },
  {
    code: "cooling_intercooler_upgrade",
    category: "COOLING",
    name: "Intercooler upgrade",
    active: false,
    sortOrder: 10,
  },
  {
    code: "cooling_oil_cooler",
    category: "COOLING",
    name: "Oil cooler",
    reliabilityImpact: 3,
    trackReadinessImpact: 3,
    sortOrder: 20,
  },
  {
    code: "intake_exhaust_intake",
    category: "INTAKE_EXHAUST",
    name: "Intake",
    active: false,
    sortOrder: 10,
  },
  {
    code: "intake_exhaust_high_flow_downpipe",
    category: "INTAKE_EXHAUST",
    name: "High-flow downpipe",
    active: false,
    sortOrder: 20,
  },
  {
    code: "engine_flex_fuel",
    category: "ENGINE",
    name: "Flex fuel",
    active: false,
    sortOrder: 20,
  },
  {
    code: "engine_turbo_upgrade",
    category: "ENGINE",
    name: "Turbo upgrade",
    active: false,
    sortOrder: 30,
  },
  {
    code: "tyres_uhp_road",
    category: "TYRES",
    name: "UHP road tyres",
    handlingImpact: 2,
    brakingImpact: 1,
    trackReadinessImpact: 2,
    sortOrder: 10,
  },
  {
    code: "tyres_semi_slick",
    category: "TYRES",
    name: "Semi-slick tyres",
    handlingImpact: 6,
    brakingImpact: 3,
    reliabilityImpact: -1,
    trackReadinessImpact: 5,
    sortOrder: 20,
  },
  {
    code: "tyres_slick",
    category: "TYRES",
    name: "Slick tyres",
    handlingImpact: 9,
    brakingImpact: 4,
    reliabilityImpact: -2,
    trackReadinessImpact: 5,
    sortOrder: 30,
  },
  {
    code: "wheels_lightweight",
    category: "WHEELS",
    name: "Lightweight wheels",
    handlingImpact: 2,
    brakingImpact: 1,
    trackReadinessImpact: 1,
    sortOrder: 10,
  },
  {
    code: "drivetrain_aftermarket_lsd",
    category: "DRIVETRAIN",
    name: "Aftermarket LSD",
    active: false,
    sortOrder: 10,
  },
  {
    code: "drivetrain_transmission_software",
    category: "DRIVETRAIN",
    name: "Transmission software",
    active: false,
    sortOrder: 20,
  },
  {
    code: "safety_bucket_seat",
    category: "SAFETY",
    name: "Bucket seat",
    trackReadinessImpact: 3,
    sortOrder: 10,
  },
  {
    code: "safety_harness",
    category: "SAFETY",
    name: "Harness",
    trackReadinessImpact: 4,
    sortOrder: 20,
  },
  {
    code: "safety_half_cage",
    category: "SAFETY",
    name: "Half cage",
    reliabilityImpact: 1,
    trackReadinessImpact: 4,
    sortOrder: 30,
  },
  {
    code: "safety_full_roll_cage",
    category: "SAFETY",
    name: "Full roll cage",
    reliabilityImpact: 2,
    trackReadinessImpact: 6,
    sortOrder: 40,
  },
] as const;

const coiloverCodes = modificationCatalog
  .filter((item) => item.name === "Coilover")
  .map((item) => item.code);

const modificationConflictCodePairs = [
  ...coiloverCodes.map((coiloverCode) => [
    "suspension_sport_springs_generic",
    coiloverCode,
  ] as const),
  ...pairwise(coiloverCodes),
  ["brakes_performance_pads", "brakes_track_pads"],
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
    powerRating: 42,
    handlingRating: 78,
    brakingRating: 58,
    reliabilityRating: 82,
    thermalRating: 63,
    trackReadinessRating: 68,
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
    powerRating: 52,
    handlingRating: 79,
    brakingRating: 60,
    reliabilityRating: 80,
    thermalRating: 64,
    trackReadinessRating: 70,
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
    powerRating: 61,
    handlingRating: 72,
    brakingRating: 65,
    reliabilityRating: 76,
    thermalRating: 67,
    trackReadinessRating: 69,
    ratingStatus: "PROVISIONAL",
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
    powerRating: 92,
    handlingRating: 76,
    brakingRating: 78,
    reliabilityRating: 70,
    thermalRating: 82,
    trackReadinessRating: 72,
    weightPenalty: 8,
    ratingStatus: "PROVISIONAL",
    sortOrder: 40,
  },
  {
    code: "bmw_g20_320i_pre_lci",
    brand: "BMW",
    model: "320i",
    generation: "G20",
    variant: "pre-LCI",
    yearFrom: 2019,
    yearTo: 2022,
    powertrain: "ICE",
    drivetrain: "RWD",
    powerRating: 54,
    handlingRating: 65,
    brakingRating: 58,
    reliabilityRating: 72,
    thermalRating: 61,
    trackReadinessRating: 55,
    ratingStatus: "PROVISIONAL",
    sortOrder: 50,
  },
  {
    code: "bmw_g20_320i_lci",
    brand: "BMW",
    model: "320i",
    generation: "G20",
    variant: "LCI",
    yearFrom: 2022,
    powertrain: "ICE",
    drivetrain: "RWD",
    powerRating: 55,
    handlingRating: 66,
    brakingRating: 59,
    reliabilityRating: 73,
    thermalRating: 62,
    trackReadinessRating: 56,
    ratingStatus: "PROVISIONAL",
    sortOrder: 60,
  },
  {
    code: "bmw_g22_420i_pre_lci",
    brand: "BMW",
    model: "420i",
    generation: "G22",
    variant: "pre-LCI",
    yearFrom: 2020,
    yearTo: 2024,
    powertrain: "ICE",
    drivetrain: "RWD",
    powerRating: 55,
    handlingRating: 64,
    brakingRating: 58,
    reliabilityRating: 71,
    thermalRating: 61,
    trackReadinessRating: 55,
    ratingStatus: "PROVISIONAL",
    sortOrder: 70,
  },
  {
    code: "bmw_g22_420i_lci",
    brand: "BMW",
    model: "420i",
    generation: "G22",
    variant: "LCI",
    yearFrom: 2024,
    powertrain: "ICE",
    drivetrain: "RWD",
    powerRating: 56,
    handlingRating: 65,
    brakingRating: 59,
    reliabilityRating: 72,
    thermalRating: 62,
    trackReadinessRating: 56,
    ratingStatus: "PROVISIONAL",
    sortOrder: 80,
  },
  {
    code: "vw_golf_gti_mk85",
    brand: "Volkswagen",
    model: "Golf GTI",
    generation: "Mk8.5",
    yearFrom: 2024,
    powertrain: "ICE",
    drivetrain: "FWD",
    powerRating: 68,
    handlingRating: 70,
    brakingRating: 66,
    reliabilityRating: 72,
    thermalRating: 68,
    trackReadinessRating: 67,
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
    powerRating: 74,
    handlingRating: 73,
    brakingRating: 70,
    reliabilityRating: 70,
    thermalRating: 70,
    trackReadinessRating: 72,
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
    powerRating: 78,
    handlingRating: 74,
    brakingRating: 72,
    reliabilityRating: 70,
    thermalRating: 72,
    trackReadinessRating: 73,
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
    powerRating: 74,
    handlingRating: 76,
    brakingRating: 72,
    reliabilityRating: 75,
    thermalRating: 70,
    trackReadinessRating: 76,
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
    powerRating: 77,
    handlingRating: 81,
    brakingRating: 75,
    reliabilityRating: 76,
    thermalRating: 73,
    trackReadinessRating: 80,
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
    powerRating: 79,
    handlingRating: 84,
    brakingRating: 78,
    reliabilityRating: 77,
    thermalRating: 75,
    trackReadinessRating: 83,
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
    powerRating: 70,
    handlingRating: 58,
    brakingRating: 58,
    reliabilityRating: 66,
    thermalRating: 58,
    trackReadinessRating: 44,
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
    powerRating: 78,
    handlingRating: 59,
    brakingRating: 60,
    reliabilityRating: 66,
    thermalRating: 59,
    trackReadinessRating: 45,
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
    powerRating: 86,
    handlingRating: 62,
    brakingRating: 64,
    reliabilityRating: 65,
    thermalRating: 62,
    trackReadinessRating: 48,
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
    powerRating: 58,
    handlingRating: 48,
    brakingRating: 50,
    reliabilityRating: 62,
    thermalRating: 50,
    trackReadinessRating: 34,
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
    powerRating: 70,
    handlingRating: 50,
    brakingRating: 52,
    reliabilityRating: 62,
    thermalRating: 51,
    trackReadinessRating: 36,
    weightPenalty: 8,
    ratingStatus: "PROVISIONAL",
    sortOrder: 190,
  },
] as const;

const bmwB48Codes = [
  "bmw_g20_320i_pre_lci",
  "bmw_g20_320i_lci",
  "bmw_g22_420i_pre_lci",
  "bmw_g22_420i_lci",
] as const;
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
  ...bmwB48Codes.map((vehicleCode) => ({
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
  ...bmwB48Codes.flatMap((vehicleCode) => [
    impact(vehicleCode, "engine_rsa300", { powerImpact: 18, reliabilityImpact: -2, thermalImpact: -3, trackReadinessImpact: 1 }),
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

async function seedPlatformCompatibilities(
  definitionsByCode: Map<string, { id: string }>,
  vehicleDefinitionsByCode: Map<string, { id: string }>,
) {
  for (const compatibility of platformModificationCompatibilities) {
    const modificationDefinition = definitionsByCode.get(compatibility.modificationCode);
    const vehicleDefinition = vehicleDefinitionsByCode.get(compatibility.vehicleCode);

    if (!modificationDefinition || !vehicleDefinition) {
      throw new Error(
        `Missing definition for platform compatibility ${compatibility.modificationCode}:${compatibility.vehicleCode}`,
      );
    }

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
}

async function seedPlatformImpacts(
  definitionsByCode: Map<string, { id: string }>,
  vehicleDefinitionsByCode: Map<string, { id: string }>,
) {
  for (const impactValue of platformModificationImpacts) {
    const modificationDefinition = definitionsByCode.get(impactValue.modificationCode);
    const vehicleDefinition = vehicleDefinitionsByCode.get(impactValue.vehicleCode);

    if (!modificationDefinition || !vehicleDefinition) {
      throw new Error(
        `Missing definition for platform impact ${impactValue.modificationCode}:${impactValue.vehicleCode}`,
      );
    }

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
