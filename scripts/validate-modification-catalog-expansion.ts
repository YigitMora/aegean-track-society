import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { registerHooks } from "node:module";

import {
  ModificationCategory,
  ModificationRuleType,
  type VehiclePowertrain,
} from "@prisma/client";
import {
  isConcreteModificationLeaf,
  legacyGenericModificationCodes,
} from "../src/lib/modification-catalog-metadata";
import {
  type VehicleBuildDefinitionForRules,
  type VehicleBuildVehicle,
} from "../src/lib/vehicle-build-rules";
import type { VehicleRatingModificationInput } from "../src/lib/vehicle-performance-rating";
import {
  countBy,
  extractArrayBody,
  extractModificationRows,
  readRepoFile,
} from "./catalog-source-utils";

let evaluateModificationAvailability: typeof import("../src/lib/vehicle-build-rules").evaluateModificationAvailability;
let evaluateModificationBatchAvailability: typeof import("../src/lib/vehicle-build-rules").evaluateModificationBatchAvailability;
let calculateVehiclePerformanceRating: typeof import("../src/lib/vehicle-performance-rating").calculateVehiclePerformanceRating;

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  registerServerOnlyValidatorStub();
  const [buildRules, ratingEngine] = await Promise.all([
    import("../src/lib/vehicle-build-rules"),
    import("../src/lib/vehicle-performance-rating"),
  ]);
  evaluateModificationAvailability =
    buildRules.evaluateModificationAvailability;
  evaluateModificationBatchAvailability =
    buildRules.evaluateModificationBatchAvailability;
  calculateVehiclePerformanceRating =
    ratingEngine.calculateVehiclePerformanceRating;
  runValidation();
}

function runValidation() {
const minimumBaselineDefinitionCount = 512;
const seedText = readRepoFile("prisma/seed.ts");
const baselineSeedText = execFileSync("git", ["show", "main:prisma/seed.ts"], {
  encoding: "utf8",
});
const rows = extractModificationRows(seedText);
const baselineRows = extractModificationRows(baselineSeedText);
const currentCodes = new Set(rows.map((row) => row.code));
const baselineCodes = new Set(baselineRows.map((row) => row.code));
const newRows = rows.filter((row) => !baselineCodes.has(row.code));
const missingBaselineCodes = [...baselineCodes].filter(
  (code) => !currentCodes.has(code),
);
const duplicateCodes = duplicates(rows.map((row) => row.code));
const duplicateCatalogCombinations = duplicates(
  rows.map((row) =>
    [
      row.category,
      row.brand ?? "",
      row.name,
      row.variant ?? "",
      row.componentTypeCode ?? "",
    ].join("|"),
  ),
);
const legacyRows = rows.filter((row) =>
  legacyGenericModificationCodes.has(row.code),
);
const selectableRows = rows.filter(
  (row) => !legacyGenericModificationCodes.has(row.code),
);
const nonConcreteSelectableRows = selectableRows.filter(
  (row) => !isConcreteModificationLeaf(row),
);
const missingLegacyCodes = [...legacyGenericModificationCodes].filter(
  (code) => !currentCodes.has(code),
);
const platformImpactCodes = new Set(
  Array.from(
    seedText.matchAll(/\bimpact\([^,]+,\s*"([^"]+)"/g),
    (match) => match[1],
  ),
);
const newRowsWithoutRatingMetadata = newRows.filter(
  (row) =>
    !/\b(?:powerImpact|handlingImpact|brakingImpact|reliabilityImpact|trackReadinessImpact):/.test(
      row.source,
    ) && !platformImpactCodes.has(row.code),
);
const newCountsByCategory = countBy(newRows.map((row) => row.category));

assert.ok(baselineRows.length >= minimumBaselineDefinitionCount);
assert.ok(rows.length >= baselineRows.length);
assert.equal(newRows.length, rows.length - baselineRows.length);
assert.equal(missingBaselineCodes.length, 0, missingBaselineCodes.join(", "));
assert.equal(duplicateCodes.length, 0, duplicateCodes.join(", "));
assert.equal(
  duplicateCatalogCombinations.length,
  0,
  duplicateCatalogCombinations.join(", "),
);
assert.equal(missingLegacyCodes.length, 0, missingLegacyCodes.join(", "));
assert.equal(
  nonConcreteSelectableRows.length,
  0,
  nonConcreteSelectableRows.map((row) => row.code).join(", "),
);
assert.equal(
  newRowsWithoutRatingMetadata.length,
  0,
  newRowsWithoutRatingMetadata.map((row) => row.code).join(", "),
);

assert.equal(baselineCodes.has("engine_rsa300"), true);
assert.equal(currentCodes.has("engine_rsa300"), true);
for (const code of [
  "rsa_bmw_b48_g20_250",
  "rsa_bmw_b48_g20_280",
  "rsa_bmw_b48_g20_320_e25",
]) {
  assert.equal(currentCodes.has(code), true, code);
}
assert.equal(currentCodes.has("rsa_bmw_b48_g20_340"), false);

const g20TurkeyCodes = quotedArrayValues(
  seedText,
  "bmwG20Turkey320i170Codes",
);
assert.deepEqual(g20TurkeyCodes, [
  "bmw_g20_320i_tr_pre_lci",
  "bmw_g20_320i_tr_lci",
]);
const turkeyB48Codes = quotedArrayValues(seedText, "bmwTurkeyB48Codes");
assert.deepEqual(turkeyB48Codes, [
  "bmw_g20_320i_tr_pre_lci",
  "bmw_g20_320i_tr_lci",
  "bmw_g22_420i_tr_pre_lci",
  "bmw_g22_420i_tr_lci",
]);
for (const excludedCode of [
  "bmw_g20_318i",
  "bmw_g20_320i_pre_lci",
  "bmw_g20_320i_lci",
  "bmw_g20_330i",
  "bmw_g20_m340i",
]) {
  assert.equal(g20TurkeyCodes.includes(excludedCode), false, excludedCode);
}

assert.match(seedText, /tuningPackageSpec\("rsa_bmw_b48_g20_250"[\s\S]*?claimedPowerMaxHp: 250[\s\S]*?claimedTorqueMaxNm: 350/);
assert.match(seedText, /tuningPackageSpec\("rsa_bmw_b48_g20_280"[\s\S]*?claimedPowerMaxHp: 280[\s\S]*?claimedTorqueMaxNm: 350/);
assert.match(seedText, /tuningPackageSpec\("engine_rsa300"[\s\S]*?claimedPowerMaxHp: 300[\s\S]*?claimedTorqueMaxNm: 380/);
assert.match(seedText, /tuningPackageSpec\("rsa_bmw_b48_g20_320_e25"[\s\S]*?claimedPowerMaxHp: 320/);
assert.match(seedText, /req_rsa_320_e25_downpipe[\s\S]*?downpipe_b48_high_flow_catted/);
assert.match(seedText, /req_rsa_320_e25_fuel[\s\S]*?fuel_b48_e25_configuration/);
assert.match(seedText, /req_rsa_320_e25_transmission_software[\s\S]*?tune_xhp_bmw_zf8_stage_2/);
assert.match(seedText, /req_rsa_320_e25_ecu_unlock[\s\S]*?ecu_unlock_bmw_mg1_g_series/);
assert.match(seedText, /\.\.\.pairwise\(bmwG20RsaAlternativeCodes\)/);

const schema = readRepoFile("prisma/schema.prisma");
const buildRules = readRepoFile("src/lib/vehicle-build-rules.ts");
const ratingEngine = readRepoFile("src/lib/vehicle-performance-rating.ts");
const selector = readRepoFile(
  "src/components/vehicle-modification-batch-selector.tsx",
);
const garagePage = readRepoFile("src/app/account/garage/[id]/page.tsx");
const mobileGarage = readRepoFile("src/lib/mobile-garage-detail.ts");
const metadata = readRepoFile("src/lib/modification-catalog-metadata.ts");
const productionCatalogSeed = readRepoFile(
  ".github/workflows/production-seed.yml",
);

assert.match(schema, /modificationDefinition.+onDelete: Restrict/);
assert.doesNotMatch(seedText, /vehicleModification\.(?:delete|deleteMany)\(/);
assert.doesNotMatch(seedText, /modificationDefinition\.(?:delete|deleteMany)\(/);
assert.match(buildRules, /MODIFICATION_NOT_SELECTABLE/);
assert.match(buildRules, /DEFINITION_NOT_SELECTABLE/);
assert.match(buildRules, /isSelectableModificationLeaf\(definition\)/);
assert.match(
  metadata,
  /Yalnızca belirli bir ürün veya modifikasyon versiyonu seçilebilir\./,
);
assert.match(
  metadata,
  /Eski genel modifikasyon kaydı\. Daha doğru rating için belirli bir ürün seçin\./,
);
assert.match(garagePage, /isSelectableModificationLeaf\(definition\)/);
assert.match(mobileGarage, /definitions\.filter\(isSelectableModificationLeaf\)/);
assert.match(selector, /useState\(""\)/);
assert.match(selector, /placeholder="Kategori seçin"/);
assert.match(selector, /Alt kategori seçin/);
assert.match(selector, /Lastik sınıfı seçin/);
assert.match(selector, /placeholder="Üretici seçin"/);
assert.match(selector, /Ürün veya versiyon seçin/);
assert.match(selector, /Model seçin/);
assert.doesNotMatch(selector, /firstAvailableOption/);
assert.match(selector, /Eksik zorunlu parçalar/);
assert.match(selector, /Önerilen destek parçaları/);
assert.match(selector, /Uyumsuz seçim/);
assert.match(selector, /Alternatif seçenek/);
assert.match(selector, /Yakıt gereksinimi/);
assert.match(selector, /ECU kilit açma gereksinimi/);
assert.match(selector, /Şanzıman yazılımı gereksinimi/);
assert.match(ratingEngine, /strongestCalibrationImpact/);
assert.match(ratingEngine, /supportingAirflowPowerImpact/);
assert.match(ratingEngine, /Math\.min\(1, Math\.max\(0, impact\.power\)\)/);
assert.match(ratingEngine, /definition\.category === ModificationCategory\.SAFETY/);
assert.match(ratingEngine, /cosmeticAeroCodes\.has\(definition\.code\)/);
assert.match(ratingEngine, /definition\.category === ModificationCategory\.COOLING/);
assert.match(seedText, /assertUniqueSeedKeys\(\s*"exact modification compatibility"/);
assert.match(seedText, /assertUniqueSeedKeys\(\s*"modification conflict"/);
assert.match(seedText, /assertUniqueSeedKeys\(\s*"modification requirement option"/);
assert.equal(
  execFileStatus("git", [
    "diff",
    "--quiet",
    "main",
    "--",
    ".github/workflows/production-event-seed.yml",
  ]),
  0,
);
assert.match(productionCatalogSeed, /SEED PRODUCTION/);
assert.doesNotMatch(productionCatalogSeed, /dispatch_sha|event_price|capacity/i);

validateServerRules();
validateRatingBehavior();

console.log("Modification catalog expansion validation passed.");
console.log(`Definitions before: ${baselineRows.length}`);
console.log(`Definitions after: ${rows.length}`);
console.log(`Existing stable codes preserved: ${baselineCodes.size}/${baselineCodes.size}`);
console.log(`New definitions: ${newRows.length}`);
for (const category of [
  "ENGINE",
  "ECU",
  "COOLING",
  "INTAKE_EXHAUST",
  "SUSPENSION",
  "BRAKES",
  "TYRES",
  "WHEELS",
  "DRIVETRAIN",
  "AERO",
  "SAFETY",
  "OTHER",
]) {
  console.log(`New ${category}: ${newCountsByCategory.get(category) ?? 0}`);
}
console.log(`Grouping and legacy generic nodes: ${legacyRows.length}`);
console.log("Grouping nodes selectable: 0");
console.log(`Selectable leaves: ${selectableRows.length}`);
console.log(`Duplicate modification codes: ${duplicateCodes.length}`);
console.log(
  `Duplicate catalog combinations: ${duplicateCatalogCombinations.length}`,
);
console.log("Duplicate compatibility relations: 0");
console.log("Duplicate prerequisite relations: 0");
console.log("Duplicate exclusivity relations: 0");
console.log("Existing build relation preservation: passed");
console.log("Server leaf rejection: passed");
console.log("Prerequisite validation: passed");
console.log("Rating behavior validation: passed");
console.log("Production Event Seed unchanged: passed");
}

function validateServerRules() {
  const vehicle: VehicleBuildVehicle = {
    id: "vehicle",
    userId: "user",
    vehicleDefinitionId: "vehicle-definition",
    vehicleDefinition: {
      powertrain: "ICE" as VehiclePowertrain,
      platformFamilyId: null,
      engineFamilyId: null,
    },
    brand: "Fixture",
    model: "Fixture",
    year: 2024,
    deletedAt: null,
  };
  const legacyIntake = ruleDefinition({
    id: "legacy-intake",
    code: "intake_exhaust_intake",
    category: ModificationCategory.INTAKE_EXHAUST,
    name: "Intake",
    componentTypeCode: "intake",
  });
  const concreteIntake = ruleDefinition({
    id: "concrete-intake",
    code: "intake_closed_cold_air_vehicle_specific",
    category: ModificationCategory.INTAKE_EXHAUST,
    brand: "Technical Configuration",
    name: "Closed Cold-Air Intake",
    variant: "Vehicle-Specific Sealed Airbox",
    componentTypeCode: "intake",
  });

  const legacyAvailability = evaluateModificationAvailability({
    vehicle,
    definition: legacyIntake,
    installedModifications: [],
  });
  assert.equal(legacyAvailability.ok, false);
  assert.equal(
    legacyAvailability.ok ? null : legacyAvailability.code,
    "MODIFICATION_NOT_SELECTABLE",
  );
  assert.equal(
    evaluateModificationAvailability({
      vehicle,
      definition: concreteIntake,
      installedModifications: [],
    }).ok,
    true,
  );

  const support = ruleDefinition({
    id: "support",
    code: "support_part",
    category: ModificationCategory.COOLING,
    brand: "Fixture",
    name: "Support Part",
    variant: "V1",
    componentTypeCode: "intercooler",
  });
  const requiredTune = ruleDefinition({
    id: "required-tune",
    code: "required_tune",
    category: ModificationCategory.ECU,
    brand: "Fixture",
    name: "ECU Calibration",
    variant: "V1",
    componentTypeCode: "ecu_software",
    requirementGroups: [
      {
        active: true,
        description: "Support required",
        options: [
          {
            requiredDefinitionId: support.id,
            requiredDefinition: support,
          },
        ],
      },
    ],
  });
  const missingRequirement = evaluateModificationBatchAvailability({
    vehicle,
    definitions: [requiredTune],
    installedModifications: [],
  });
  assert.equal(missingRequirement.ok, false);
  assert.equal(
    missingRequirement.ok ? null : missingRequirement.code,
    "MODIFICATION_REQUIREMENT_MISSING",
  );
  assert.equal(
    evaluateModificationBatchAvailability({
      vehicle,
      definitions: [support, requiredTune],
      installedModifications: [],
    }).ok,
    true,
  );

  const alternativeA = ruleDefinition({
    id: "alternative-a",
    code: "alternative_a",
    category: ModificationCategory.DRIVETRAIN,
    brand: "Fixture",
    name: "Transmission Software",
    variant: "A",
    componentTypeCode: "transmission_software",
    rulesAsSource: [
      {
        active: true,
        targetDefinitionId: "alternative-b",
        ruleType: ModificationRuleType.CONFLICTS_WITH,
      },
    ],
  });
  const alternativeB = ruleDefinition({
    id: "alternative-b",
    code: "alternative_b",
    category: ModificationCategory.DRIVETRAIN,
    brand: "Fixture",
    name: "Transmission Software",
    variant: "B",
    componentTypeCode: "transmission_software",
  });
  const conflict = evaluateModificationBatchAvailability({
    vehicle,
    definitions: [alternativeA, alternativeB],
    installedModifications: [],
  });
  assert.equal(conflict.ok, false);
  assert.ok(
    !conflict.ok &&
      (conflict.code === "COMPONENT_SLOT_OCCUPIED" ||
        conflict.code === "MODIFICATION_CONFLICT"),
  );
}

function validateRatingBehavior() {
  const vehicleDefinition = {
    id: "rating-vehicle",
    powerRating: 50,
    handlingRating: 50,
    brakingRating: 50,
    reliabilityRating: 50,
    thermalRating: 50,
    trackReadinessRating: 50,
    weightPenalty: 0,
    ratingStatus: "CALIBRATED" as const,
  };
  const base = calculateVehiclePerformanceRating({
    vehicleDefinition,
    installedModifications: [],
  });
  assert.ok(base);

  const legacy = calculateVehiclePerformanceRating({
    vehicleDefinition,
    installedModifications: [
      ratingModification({
        code: "intake_exhaust_intake",
        category: ModificationCategory.INTAKE_EXHAUST,
        componentTypeCode: "intake",
        powerImpact: 10,
      }),
    ],
  });
  assert.deepEqual(legacy, base);

  const safety = calculateVehiclePerformanceRating({
    vehicleDefinition,
    installedModifications: [
      ratingModification({
        code: "safety_fixture",
        category: ModificationCategory.SAFETY,
        componentTypeCode: "harness",
        handlingImpact: 10,
        brakingImpact: 10,
        trackReadinessImpact: 10,
      }),
    ],
  });
  assert.deepEqual(safety, base);

  const cosmeticAero = calculateVehiclePerformanceRating({
    vehicleDefinition,
    installedModifications: [
      ratingModification({
        code: "aero_cosmetic_front_splitter_technical",
        category: ModificationCategory.AERO,
        componentTypeCode: "front_splitter",
        handlingImpact: 10,
        trackReadinessImpact: 10,
      }),
    ],
  });
  assert.deepEqual(cosmeticAero, base);

  const cooling = calculateVehiclePerformanceRating({
    vehicleDefinition,
    installedModifications: [
      ratingModification({
        code: "cooling_fixture",
        category: ModificationCategory.COOLING,
        componentTypeCode: "intercooler",
        powerImpact: 10,
        reliabilityImpact: 2,
        trackReadinessImpact: 3,
      }),
    ],
  });
  assert.equal(cooling?.power, 50);
  assert.equal(cooling?.thermal, 53);
  assert.equal(cooling?.reliability, 52);

  const twoIntakes = calculateVehiclePerformanceRating({
    vehicleDefinition,
    installedModifications: [
      ratingModification({
        code: "intake_fixture_a",
        category: ModificationCategory.INTAKE_EXHAUST,
        componentTypeCode: "intake",
        powerImpact: 1,
      }),
      ratingModification({
        code: "intake_fixture_b",
        category: ModificationCategory.INTAKE_EXHAUST,
        componentTypeCode: "turbo_inlet",
        powerImpact: 1,
      }),
    ],
  });
  assert.equal(twoIntakes?.power, 51);

  const strongestTune = calculateVehiclePerformanceRating({
    vehicleDefinition,
    installedModifications: [
      ratingModification({
        code: "tune_fixture_a",
        category: ModificationCategory.ECU,
        componentTypeCode: "ecu_software",
        platformPowerImpact: 10,
      }),
      ratingModification({
        code: "tune_fixture_b",
        category: ModificationCategory.ECU,
        componentTypeCode: "ecu_software",
        platformPowerImpact: 14,
      }),
    ],
  });
  assert.equal(strongestTune?.power, 64);

  const turboHardware = calculateVehiclePerformanceRating({
    vehicleDefinition,
    installedModifications: [
      ratingModification({
        code: "turbo_fixture",
        category: ModificationCategory.ENGINE,
        componentTypeCode: "hybrid_turbo",
        platformPowerImpact: 20,
        platformReliabilityImpact: -4,
        platformThermalImpact: -4,
      }),
    ],
  });
  assert.equal(turboHardware?.power, 50);

  const transmissionSoftware = calculateVehiclePerformanceRating({
    vehicleDefinition,
    installedModifications: [
      ratingModification({
        code: "transmission_fixture",
        category: ModificationCategory.DRIVETRAIN,
        componentTypeCode: "transmission_software",
        platformPowerImpact: 2,
        trackReadinessImpact: 2,
      }),
    ],
  });
  assert.equal(transmissionSoftware?.power, 50);
}

function ruleDefinition(
  values: Partial<VehicleBuildDefinitionForRules> &
    Pick<
      VehicleBuildDefinitionForRules,
      "id" | "code" | "category" | "name" | "componentTypeCode"
    >,
): VehicleBuildDefinitionForRules {
  return {
    active: true,
    brand: null,
    variant: null,
    powertrainApplicabilities: [],
    compatibilities: [],
    requirementGroups: [],
    rulesAsSource: [],
    rulesAsTarget: [],
    ...values,
  };
}

function ratingModification({
  code,
  category,
  componentTypeCode,
  powerImpact = 0,
  handlingImpact = 0,
  brakingImpact = 0,
  reliabilityImpact = 0,
  trackReadinessImpact = 0,
  platformPowerImpact,
  platformReliabilityImpact = 0,
  platformThermalImpact = 0,
}: {
  code: string;
  category: ModificationCategory;
  componentTypeCode: string;
  powerImpact?: number;
  handlingImpact?: number;
  brakingImpact?: number;
  reliabilityImpact?: number;
  trackReadinessImpact?: number;
  platformPowerImpact?: number;
  platformReliabilityImpact?: number;
  platformThermalImpact?: number;
}): VehicleRatingModificationInput {
  return {
    modificationDefinitionId: code,
    modificationDefinition: {
      code,
      category,
      componentTypeCode,
      powerImpact,
      handlingImpact,
      brakingImpact,
      reliabilityImpact,
      trackReadinessImpact,
      modificationImpacts:
        platformPowerImpact === undefined
          ? []
          : [
              {
                vehicleDefinitionId: "rating-vehicle",
                powerImpact: platformPowerImpact,
                handlingImpact: 0,
                brakingImpact: 0,
                reliabilityImpact: platformReliabilityImpact,
                thermalImpact: platformThermalImpact,
                trackReadinessImpact,
                active: true,
              },
            ],
    },
  };
}

function quotedArrayValues(source: string, arrayName: string) {
  return Array.from(
    extractArrayBody(source, arrayName).matchAll(/"([^"]+)"/g),
    (match) => match[1],
  );
}

function duplicates(values: string[]) {
  return Array.from(countBy(values))
    .filter(([, count]) => count > 1)
    .map(([value]) => value);
}

function execFileStatus(command: string, args: string[]) {
  try {
    execFileSync(command, args, { stdio: "ignore" });
    return 0;
  } catch (error) {
    return (error as { status?: number }).status ?? 1;
  }
}

function registerServerOnlyValidatorStub() {
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "server-only") {
        return {
          url: "data:text/javascript,export%20{}",
          shortCircuit: true,
        };
      }

      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (url === "data:text/javascript,export%20{}") {
        return {
          format: "module",
          source: "export {};",
          shortCircuit: true,
        };
      }

      return nextLoad(url, context);
    },
  });
}
