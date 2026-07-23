import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { registerHooks } from "node:module";

import {
  ModificationCategory,
  ModificationRuleType,
  type VehiclePowertrain,
} from "@prisma/client";
import {
  isSelectableModificationLeaf,
  legacyGenericModificationCodes,
} from "../src/lib/modification-catalog-metadata";
import {
  tyreManufacturerLabel,
  tyreProductModelLabel,
  tyreSurfaceIntentLabel,
  tyreTreadwearLabel,
  visibleTyreClassForDefinition,
  visibleTyreClassLabel,
  visibleTyreClasses,
} from "../src/lib/tyre-catalog";
import type {
  VehicleBuildDefinitionForRules,
  VehicleBuildVehicle,
} from "../src/lib/vehicle-build-rules";
import type { VehicleRatingModificationInput } from "../src/lib/vehicle-performance-rating";
import {
  countBy,
  extractModificationRows,
  readRepoFile,
  type ModificationSeedRow,
} from "./catalog-source-utils";

type TyreSpecificationRow = {
  code: string;
  tyreClass: string;
  dryGrip: number;
  wetGrip: number;
  coldPerformance: number;
  heatTolerance: number;
  trackConsistency: number;
  roadSuitability: number;
  wearLongevity: number;
  noiseComfort: number;
  roadLegal: boolean | null;
};

let componentSlotKeyForDefinition: typeof import("../src/lib/vehicle-build-rules").componentSlotKeyForDefinition;
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
  componentSlotKeyForDefinition = buildRules.componentSlotKeyForDefinition;
  evaluateModificationAvailability =
    buildRules.evaluateModificationAvailability;
  evaluateModificationBatchAvailability =
    buildRules.evaluateModificationBatchAvailability;
  calculateVehiclePerformanceRating =
    ratingEngine.calculateVehiclePerformanceRating;

  runValidation();
}

function runValidation() {
  const seedText = readRepoFile("prisma/seed.ts");
  const baselineSeedText = execFileSync(
    "git",
    ["show", "main:prisma/seed.ts"],
    { encoding: "utf8" },
  );
  const rows = extractModificationRows(seedText);
  const baselineRows = extractModificationRows(baselineSeedText);
  const tyres = rows.filter((row) => row.category === "TYRES");
  const baselineTyres = baselineRows.filter((row) => row.category === "TYRES");
  const tyreCodes = new Set(tyres.map((row) => row.code));
  const baselineTyreCodes = new Set(baselineTyres.map((row) => row.code));
  const missingBaselineCodes = [...baselineTyreCodes].filter(
    (code) => !tyreCodes.has(code),
  );
  const newTyres = tyres.filter((row) => !baselineTyreCodes.has(row.code));
  const legacyTyres = tyres.filter((row) =>
    legacyGenericModificationCodes.has(row.code),
  );
  const selectableTyres = tyres.filter(isSelectableModificationLeaf);
  const baselineConcreteTyres = baselineTyres.filter(
    isSelectableModificationLeaf,
  );
  const missingConcreteProducts = baselineConcreteTyres.filter(
    (row) => !tyreCodes.has(row.code),
  );
  const specs = extractTyreSpecifications(seedText);
  const specsByCode = new Map(specs.map((spec) => [spec.code, spec]));
  const selectableWithoutSpecs = selectableTyres.filter(
    (row) => !specsByCode.has(row.code),
  );
  const duplicateCodes = duplicates(tyres.map((row) => row.code));
  const duplicateProducts = duplicates(
    selectableTyres.map((row) => {
      const definition = definitionWithSpec(row, specsByCode.get(row.code));
      return [
        tyreManufacturerLabel(definition),
        tyreProductModelLabel(definition),
      ]
        .map((value) => value.toLocaleLowerCase("tr-TR"))
        .join("|");
    }),
  );
  const visibleClassLabels = visibleTyreClasses.map(({ label }) => label);
  const visibleClassCounts = countBy(
    selectableTyres.map((row) => {
      const visibleClass = visibleTyreClassForDefinition(
        definitionWithSpec(row, specsByCode.get(row.code)),
      );

      assert.ok(visibleClass, `No visible tyre class for ${row.code}`);
      return visibleClass;
    }),
  );
  const newClassCounts = countBy(
    newTyres
      .filter(isSelectableModificationLeaf)
      .map((row) => {
        const visibleClass = visibleTyreClassForDefinition(
          definitionWithSpec(row, specsByCode.get(row.code)),
        );

        assert.ok(visibleClass, `No visible tyre class for new ${row.code}`);
        return visibleClass;
      }),
  );
  const manufacturersBefore = new Set(
    baselineConcreteTyres.map((row) => tyreManufacturerLabel(row)),
  );
  const manufacturersAfter = new Set(
    selectableTyres.map((row) => tyreManufacturerLabel(row)),
  );
  const productsByManufacturer = Array.from(
    countBy(selectableTyres.map((row) => tyreManufacturerLabel(row))),
  ).sort(([first], [second]) => first.localeCompare(second, "tr-TR"));

  assert.equal(baselineTyres.length, 57);
  assert.equal(tyres.length, 108);
  assert.equal(missingBaselineCodes.length, 0, missingBaselineCodes.join(", "));
  assert.equal(
    missingConcreteProducts.length,
    0,
    missingConcreteProducts.map((row) => row.code).join(", "),
  );
  assert.equal(selectableWithoutSpecs.length, 0);
  assert.deepEqual(visibleClassLabels, [
    "Yol Lastiği",
    "Semi-Slick",
    "Slick",
  ]);
  assert.equal(visibleClassCounts.size, 3);
  assert.ok((visibleClassCounts.get("ROAD") ?? 0) > 0);
  assert.ok((visibleClassCounts.get("SEMI_SLICK") ?? 0) > 0);
  assert.ok((visibleClassCounts.get("SLICK") ?? 0) > 0);
  assert.equal(legacyTyres.length, 8);
  assert.equal(legacyTyres.some(isSelectableModificationLeaf), false);
  assert.equal(duplicateCodes.length, 0, duplicateCodes.join(", "));
  assert.equal(duplicateProducts.length, 0, duplicateProducts.join(", "));
  assert.ok(manufacturersAfter.size >= 19);
  assert.ok(manufacturersAfter.size > manufacturersBefore.size);
  assert.equal(selectableTyres.every(isSelectableModificationLeaf), true);

  validateClassification(selectableTyres, specsByCode);
  validateGroupingNodes();
  validateSourceSafeguards(seedText);
  validateSelectorContracts();
  validateExclusivity(rows);
  validateRatingBehavior(rows, specsByCode);

  console.log("Tyre catalog validation passed.");
  console.log(`Tyre definitions before: ${baselineTyres.length}`);
  console.log(`Tyre definitions after: ${tyres.length}`);
  console.log(
    `Existing stable codes preserved: ${baselineTyreCodes.size}/${baselineTyreCodes.size}`,
  );
  console.log(
    `Existing concrete products preserved: ${baselineConcreteTyres.length}/${baselineConcreteTyres.length}`,
  );
  console.log(`New tyre definitions: ${newTyres.length}`);
  console.log(`New road tyre products: ${newClassCounts.get("ROAD") ?? 0}`);
  console.log(
    `New semi-slick products: ${newClassCounts.get("SEMI_SLICK") ?? 0}`,
  );
  console.log(`New slick products: ${newClassCounts.get("SLICK") ?? 0}`);
  console.log(`Road tyre count: ${visibleClassCounts.get("ROAD") ?? 0}`);
  console.log(
    `Semi-slick count: ${visibleClassCounts.get("SEMI_SLICK") ?? 0}`,
  );
  console.log(`Slick count: ${visibleClassCounts.get("SLICK") ?? 0}`);
  console.log(
    `Manufacturers before/after: ${manufacturersBefore.size}/${manufacturersAfter.size}`,
  );
  console.log(
    `Products by manufacturer: ${productsByManufacturer
      .map(([manufacturer, count]) => `${manufacturer}=${count}`)
      .join(", ")}`,
  );
  console.log(`Selectable tyre leaves: ${selectableTyres.length}`);
  console.log(`Legacy tyre entries: ${legacyTyres.length}`);
  console.log(`Duplicate stable codes: ${duplicateCodes.length}`);
  console.log(`Duplicate manufacturer/products: ${duplicateProducts.length}`);
  console.log("Duplicate compatibility relations: 0");
  console.log("Existing build relation preservation: passed");
  console.log("Grouping nodes selectable: 0");
  console.log("Tyre exclusivity: passed");
  console.log("Tyre rating audit: passed");
  console.log("Mobile tyre selector: passed");
}

function validateClassification(
  tyres: ModificationSeedRow[],
  specsByCode: Map<string, TyreSpecificationRow>,
) {
  const wetTyres = tyres.filter(
    (row) => specsByCode.get(row.code)?.tyreClass === "WET_RACING",
  );

  for (const row of tyres) {
    const spec = specsByCode.get(row.code);
    assert.ok(spec, row.code);
    const definition = definitionWithSpec(row, spec);
    const visibleClass = visibleTyreClassForDefinition(definition);
    assert.ok(visibleClass, row.code);
    assert.ok(visibleTyreClassLabel(visibleClass), row.code);
  }

  assert.ok(wetTyres.length > 0);
  for (const row of wetTyres) {
    const definition = definitionWithSpec(row, specsByCode.get(row.code));
    assert.equal(visibleTyreClassForDefinition(definition), "SLICK");
    assert.equal(tyreSurfaceIntentLabel(definition), "Islak");
  }

  assert.equal(
    tyreTreadwearLabel(
      definitionWithSpec(
        requiredRow(tyres, "tyre_bridgestone_potenza_re_71rs"),
        specsByCode.get("tyre_bridgestone_potenza_re_71rs"),
      ),
    ),
    "TW 200",
  );
}

function validateGroupingNodes() {
  const classNode = {
    active: true,
    code: "tyre_group_semi_slick",
    category: "TYRES",
    brand: null,
    name: "Semi-Slick",
    variant: null,
    componentTypeCode: "tyre_semi_slick",
  };
  const manufacturerNode = {
    active: true,
    code: "tyre_group_michelin",
    category: "TYRES",
    brand: "Michelin",
    name: "Michelin",
    variant: null,
    componentTypeCode: "tyre_uhp_road",
  };

  assert.equal(isSelectableModificationLeaf(classNode), false);
  assert.equal(isSelectableModificationLeaf(manufacturerNode), false);

  const vehicle = fixtureVehicle();
  for (const node of [classNode, manufacturerNode]) {
    const availability = evaluateModificationAvailability({
      vehicle,
      definition: ruleDefinition({
        ...node,
        id: node.code,
        category: ModificationCategory.TYRES,
      }),
      installedModifications: [],
    });
    assert.equal(availability.ok, false);
    assert.equal(
      availability.ok ? null : availability.code,
      "MODIFICATION_NOT_SELECTABLE",
    );
  }
}

function validateSourceSafeguards(seedText: string) {
  const schema = readRepoFile("prisma/schema.prisma");
  const ratingEngine = readRepoFile("src/lib/vehicle-performance-rating.ts");

  assert.match(schema, /modificationDefinition.+onDelete: Restrict/);
  assert.doesNotMatch(seedText, /vehicleModification\.(?:delete|deleteMany)\(/);
  assert.doesNotMatch(seedText, /modificationDefinition\.(?:delete|deleteMany)\(/);
  assert.match(
    seedText,
    /assertUniqueSeedKeys\(\s*"exact modification compatibility"/,
  );
  assert.match(seedText, /assertUniqueSeedKeys\(\s*"modification conflict"/);
  assert.match(ratingEngine, /strongestTyreImpact/);
  assert.match(ratingEngine, /definition\.category === ModificationCategory\.TYRES/);
}

function validateSelectorContracts() {
  const selector = readRepoFile(
    "src/components/vehicle-modification-batch-selector.tsx",
  );
  const garagePage = readRepoFile("src/app/account/garage/[id]/page.tsx");
  const mobileGarage = readRepoFile("src/lib/mobile-garage-detail.ts");
  const mobileContract = readRepoFile(
    "src/lib/mobile-garage-detail-contract.ts",
  );
  const presentation = readRepoFile("src/lib/modification-presentation.ts");

  assert.match(selector, /Lastik sınıfı/);
  assert.match(selector, /Üretici/);
  assert.match(selector, /Model seçin/);
  assert.match(selector, /treadwearLabel/);
  assert.doesNotMatch(selector, /firstAvailableOption/);
  assert.match(garagePage, /visibleTyreClassForDefinition/);
  assert.match(presentation, /modificationTypeKey/);
  assert.match(presentation, /`tyre:\$\{visibleTyreClass\}`/);
  assert.match(mobileGarage, /tyreProductModelLabel/);
  assert.match(mobileContract, /surfaceIntentLabel/);
  assert.match(mobileContract, /treadwearLabel/);
}

function validateExclusivity(rows: ModificationSeedRow[]) {
  const componentTypes = [
    "tyre_touring",
    "tyre_uhp_road",
    "tyre_max_performance_road",
    "tyre_extreme_performance",
    "tyre_trackday",
    "tyre_semi_slick",
    "tyre_slick",
    "tyre_wet_racing",
  ];
  for (const componentTypeCode of componentTypes) {
    assert.equal(
      componentSlotKeyForDefinition({ componentTypeCode }),
      "tyre",
    );
  }

  const road = ruleDefinitionFromRow(
    requiredRow(rows, "tyre_michelin_pilot_sport_5"),
  );
  const semi = ruleDefinitionFromRow(
    requiredRow(rows, "tyre_yokohama_advan_a052"),
  );
  const wet = ruleDefinitionFromRow(
    requiredRow(rows, "tyre_pirelli_cinturato_whb"),
  );
  const installedRoad = {
    id: "installed-road",
    modificationDefinitionId: road.id,
    modificationDefinition: road,
  };
  const availability = evaluateModificationAvailability({
    vehicle: fixtureVehicle(),
    definition: semi,
    installedModifications: [installedRoad],
  });

  assert.equal(availability.ok, false);
  assert.equal(
    availability.ok ? null : availability.code,
    "COMPONENT_SLOT_OCCUPIED",
  );

  const batchAvailability = evaluateModificationBatchAvailability({
    vehicle: fixtureVehicle(),
    definitions: [road, wet],
    installedModifications: [],
  });
  assert.equal(batchAvailability.ok, false);
  assert.equal(
    batchAvailability.ok ? null : batchAvailability.code,
    "COMPONENT_SLOT_OCCUPIED",
  );
}

function validateRatingBehavior(
  rows: ModificationSeedRow[],
  specsByCode: Map<string, TyreSpecificationRow>,
) {
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

  const roadRow = requiredRow(rows, "tyre_michelin_pilot_sport_5");
  const semiRow = requiredRow(rows, "tyre_falken_azenis_rt660");
  const alternateSemiRow = requiredRow(rows, "tyre_nankang_ns_2r");
  const drySlickRow = requiredRow(rows, "tyre_pirelli_p_zero_dhg");
  const wetRacingRow = requiredRow(rows, "tyre_pirelli_cinturato_whb");
  const road = ratingFor(vehicleDefinition, [roadRow]);
  const semi = ratingFor(vehicleDefinition, [semiRow]);
  const alternateSemi = ratingFor(vehicleDefinition, [alternateSemiRow]);
  const drySlick = ratingFor(vehicleDefinition, [drySlickRow]);
  const wetRacing = ratingFor(vehicleDefinition, [wetRacingRow]);
  const stacked = ratingFor(vehicleDefinition, [roadRow, semiRow]);

  assert.equal(road.power, base.power);
  assert.equal(road.thermal, base.thermal);
  assert.ok(road.handling - base.handling <= 5);
  assert.ok(road.trackReadiness - base.trackReadiness <= 3);
  assert.notDeepEqual(semi, alternateSemi);
  assert.deepEqual(stacked, semi);
  assert.ok(drySlick.handling > wetRacing.handling);
  assert.ok(drySlick.braking > wetRacing.braking);

  const drySpec = requiredSpec(specsByCode, drySlickRow.code);
  const wetSpec = requiredSpec(specsByCode, wetRacingRow.code);
  assert.equal(drySpec.roadLegal, false);
  assert.ok(drySpec.wetGrip <= 10);
  assert.ok(drySpec.coldPerformance <= 32);
  assert.ok(drySpec.roadSuitability <= 2);
  assert.equal(wetSpec.tyreClass, "WET_RACING");
  assert.equal(wetSpec.roadLegal, false);
  assert.ok(wetSpec.wetGrip >= 90);
  assert.ok(wetSpec.dryGrip <= 52);

  const allTyres = ratingFor(vehicleDefinition, [
    roadRow,
    semiRow,
    drySlickRow,
  ]);
  assert.equal(allTyres.power, base.power);
  assert.equal(allTyres.thermal, base.thermal);
  assert.ok(allTyres.handling <= drySlick.handling);
  assert.ok(allTyres.braking <= drySlick.braking);
}

function ratingFor(
  vehicleDefinition: Parameters<
    typeof calculateVehiclePerformanceRating
  >[0]["vehicleDefinition"] & {},
  rows: ModificationSeedRow[],
) {
  const rating = calculateVehiclePerformanceRating({
    vehicleDefinition,
    installedModifications: rows.map(ratingModification),
  });

  assert.ok(rating);
  return rating;
}

function ratingModification(
  row: ModificationSeedRow,
): VehicleRatingModificationInput {
  return {
    modificationDefinitionId: row.code,
    modificationDefinition: {
      code: row.code,
      category: ModificationCategory.TYRES,
      componentTypeCode: row.componentTypeCode,
      powerImpact: row.powerImpact,
      handlingImpact: row.handlingImpact,
      brakingImpact: row.brakingImpact,
      reliabilityImpact: row.reliabilityImpact,
      trackReadinessImpact: row.trackReadinessImpact,
      modificationImpacts: [],
    },
  };
}

function definitionWithSpec(
  row: ModificationSeedRow,
  spec: TyreSpecificationRow | undefined,
) {
  return {
    ...row,
    tyreSpecification: spec
      ? {
          tyreClass: spec.tyreClass,
          roadLegal: spec.roadLegal,
        }
      : null,
  };
}

function extractTyreSpecifications(source: string): TyreSpecificationRow[] {
  return Array.from(
    source.matchAll(/tyreSpec\("([^"]+)",\s*\{([\s\S]*?)\}\),/g),
    (match) => {
      const block = match[2];
      const roadLegal = /\broadLegal:\s*(true|false)/.exec(block)?.[1];

      return {
        code: match[1],
        tyreClass: requiredString(block, "tyreClass"),
        dryGrip: requiredNumber(block, "dryGrip"),
        wetGrip: requiredNumber(block, "wetGrip"),
        coldPerformance: requiredNumber(block, "coldPerformance"),
        heatTolerance: requiredNumber(block, "heatTolerance"),
        trackConsistency: requiredNumber(block, "trackConsistency"),
        roadSuitability: requiredNumber(block, "roadSuitability"),
        wearLongevity: requiredNumber(block, "wearLongevity"),
        noiseComfort: requiredNumber(block, "noiseComfort"),
        roadLegal: roadLegal ? roadLegal === "true" : null,
      };
    },
  );
}

function requiredString(block: string, field: string) {
  const value = new RegExp(`\\b${field}:\\s*"([^"]+)"`).exec(block)?.[1];
  assert.ok(value, `Missing ${field}`);
  return value;
}

function requiredNumber(block: string, field: string) {
  const value = new RegExp(`\\b${field}:\\s*(-?\\d+)`).exec(block)?.[1];
  assert.ok(value, `Missing ${field}`);
  return Number(value);
}

function requiredRow(rows: ModificationSeedRow[], code: string) {
  const row = rows.find((candidate) => candidate.code === code);
  assert.ok(row, `Missing modification ${code}`);
  return row;
}

function requiredSpec(
  specsByCode: Map<string, TyreSpecificationRow>,
  code: string,
) {
  const spec = specsByCode.get(code);
  assert.ok(spec, `Missing tyre specification ${code}`);
  return spec;
}

function duplicates(values: string[]) {
  return Array.from(countBy(values))
    .filter(([, count]) => count > 1)
    .map(([value]) => value);
}

function fixtureVehicle(): VehicleBuildVehicle {
  return {
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
}

function ruleDefinitionFromRow(
  row: ModificationSeedRow,
): VehicleBuildDefinitionForRules {
  return ruleDefinition({
    id: row.code,
    code: row.code,
    category: ModificationCategory.TYRES,
    brand: row.brand,
    name: row.name,
    variant: row.variant,
    componentTypeCode: row.componentTypeCode,
  });
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
