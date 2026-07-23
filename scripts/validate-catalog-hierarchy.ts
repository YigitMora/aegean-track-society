import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

import {
  buildVehicleCatalogHierarchy,
  findVehicleCatalogPath,
  searchVehicleCatalogDefinitions,
  type VehicleCatalogDefinitionInput,
  type VehicleCatalogHierarchy,
} from "../src/lib/vehicle-catalog-hierarchy";
import {
  countBy,
  extractFinalVehicleRows,
  readRepoFile,
} from "./catalog-source-utils";

const expectedDefinitionCount = 687;
const seedText = readRepoFile("prisma/seed.ts");
const baselineSeedText = execFileSync("git", ["show", "main:prisma/seed.ts"], {
  encoding: "utf8",
});
const rows = extractFinalVehicleRows(seedText);
const baselineRows = extractFinalVehicleRows(baselineSeedText);
const definitions = rows.map(toHierarchyInput);
const hierarchy = buildVehicleCatalogHierarchy(definitions);
const leaves = flattenHierarchy(hierarchy);
const currentCodes = new Set(rows.map((row) => row.code));
const baselineCodes = new Set(baselineRows.map((row) => row.code));
const missingBaselineCodes = Array.from(baselineCodes).filter(
  (code) => !currentCodes.has(code),
);
const leafCounts = countBy(leaves.map((leaf) => leaf.vehicleDefinitionId));
const duplicateDefinitionLeaves = Array.from(leafCounts).filter(
  ([, count]) => count !== 1,
);
const reachableCodes = new Set(leaves.map((leaf) => leaf.code));
const orphanCodes = rows
  .map((row) => row.code)
  .filter((code) => !reachableCodes.has(code));
const leafPathCounts = countBy(leaves.map((leaf) => leaf.pathKey));
const duplicateLeafPaths = Array.from(leafPathCounts).filter(
  ([, count]) => count > 1,
);
const stableCodeCounts = countBy(rows.map((row) => row.code));
const duplicateStableCodes = Array.from(stableCodeCounts).filter(
  ([, count]) => count > 1,
);

assert.equal(baselineRows.length, expectedDefinitionCount);
assert.equal(rows.length, expectedDefinitionCount);
assert.equal(hierarchy.definitionCount, expectedDefinitionCount);
assert.equal(leaves.length, expectedDefinitionCount);
assert.equal(missingBaselineCodes.length, 0, missingBaselineCodes.join(", "));
assert.equal(duplicateStableCodes.length, 0, duplicateStableCodes.join(", "));
assert.equal(duplicateDefinitionLeaves.length, 0, duplicateDefinitionLeaves.join(", "));
assert.equal(orphanCodes.length, 0, orphanCodes.join(", "));
assert.equal(duplicateLeafPaths.length, 0, duplicateLeafPaths.join("\n"));

for (const brand of [
  "BMW",
  "Volkswagen",
  "Audi",
  "Mercedes-Benz",
  "Fiat",
  "Abarth",
  "Honda",
  "Hyundai",
  "Toyota",
  "Porsche",
  "Ferrari",
  "Alfa Romeo",
  "Renault",
  "Peugeot",
  "Ford",
  "Mazda",
  "Nissan",
]) {
  assert.ok(hierarchy.brands.some((candidate) => candidate.name === brand), brand);
}

assertCatalogPath("bmw_330i_e46", "BMW", "3 Serisi", "E46", "330i");
assertCatalogPath("bmw_m3_e46", "BMW", "M3", "E46", "M3");
assertCatalogPath("bmw_m5_f90", "BMW", "M5", "F90", "Competition");
assertCatalogPath(
  "volkswagen_golf_mk7_14_tsi_122",
  "Volkswagen",
  "Golf",
  "Mk7",
  "1.4 TSI",
);
assertCatalogPath(
  "volkswagen_polo_6r_12_tsi_90",
  "Volkswagen",
  "Polo",
  "6R/6C",
  "1.2 TSI",
);
assertCatalogPath(
  "mercedes_c180_w205",
  "Mercedes-Benz",
  "C-Serisi",
  "W205",
  "C180",
);
assertCatalogPath(
  "mercedes_e200_w213",
  "Mercedes-Benz",
  "E-Serisi",
  "W213",
  "E200",
);
assertCatalogPath(
  "mercedes_glc200_x253",
  "Mercedes-Benz",
  "GLC",
  "X253",
  "GLC200",
);
assertCatalogPath("audi_a4_b9_20_tfsi", "Audi", "A4", "B9", "2.0 TFSI");
assertCatalogPath("audi_a6_c7_30_tdi", "Audi", "A6", "C7", "3.0 TDI");
assertCatalogPath("audi_rs6_c8", "Audi", "RS6", "C8", "RS6");
assertCatalogPath(
  "fiat_egea_sedan_16_multijet_130",
  "Fiat",
  "Egea",
  "Sedan",
  "1.6 Multijet",
);
assertCatalogPath(
  "fiat_124_spider_multiair",
  "Fiat",
  "124 Spider",
  "NF",
  "1.4 MultiAir",
);

const bmwThreeSeries = hierarchy.brands
  .find((brand) => brand.name === "BMW")
  ?.models.find((model) => model.name === "3 Serisi");
const generationNames = bmwThreeSeries?.generations.map(
  (generation) => generation.name,
) ?? [];
assertOrdered(generationNames, ["E46", "E90", "F30", "F31", "F34", "G20", "G21"]);

const naturalOrderFixture = buildVehicleCatalogHierarchy(
  ["G20", "E46", "F30", "E30", "E90", "E36"].map((generation) => ({
    id: generation,
    code: `fixture_${generation.toLowerCase()}`,
    brand: "Fixture",
    model: "Natural order",
    generation,
    chassisCode: null,
    variant: "Standard",
  })),
);
assert.deepEqual(
  naturalOrderFixture.brands[0]?.models[0]?.generations.map(
    (generation) => generation.name,
  ),
  ["E30", "E36", "E46", "E90", "F30", "G20"],
);

const searchFixture = definitions.map((definition) =>
  definition.code === "bmw_330i_e46"
    ? { ...definition, engineFamily: { name: "M54B30" } }
    : definition,
);
for (const query of [
  "BMW",
  "3 Serisi",
  "E46",
  "330i",
  "M54B30",
  "bmw_330i_e46",
]) {
  assert.ok(
    searchVehicleCatalogDefinitions(searchFixture, query).some(
      (definition) => definition.code === "bmw_330i_e46",
    ),
    `Search did not match ${query}`,
  );
}

const templateFields = readRepoFile("src/components/vehicle-template-fields.tsx");
const vehicleForm = readRepoFile("src/components/vehicle-form.tsx");
const createPage = readRepoFile("src/app/account/garage/new/page.tsx");
const editPage = readRepoFile("src/app/account/garage/[id]/page.tsx");
const adminPage = readRepoFile("src/app/admin/members/[id]/page.tsx");
const requestPage = readRepoFile("src/app/admin/catalog-requests/[id]/page.tsx");
const submitButton = readRepoFile("src/components/vehicle-submit-button.tsx");
const mobileContract = readRepoFile("src/lib/mobile-garage-contract.ts");
const garageService = readRepoFile("src/lib/garage-service.ts");
const schema = readRepoFile("prisma/schema.prisma");

assert.match(templateFields, /buildVehicleCatalogHierarchy/);
assert.match(templateFields, /label="Marka"/);
assert.match(templateFields, /label="Model"/);
assert.match(templateFields, /label="Kasa \/ Nesil"/);
assert.match(templateFields, /label="Motor \/ Versiyon"/);
assert.match(templateFields, /applyHierarchySelection/);
assert.match(templateFields, /candidate\.label === selectedPath\?\.variant\.label/);
assert.match(templateFields, /name="vehicleDefinitionId" value=\{selectedDefinitionId\}/);
assert.match(templateFields, /useId\(\)/);
assert.doesNotMatch(templateFields, /useEffect\(/);
assert.match(createPage, /engineFamily:/);
assert.match(editPage, /vehicle=\{vehicle\}/);
assert.match(
  vehicleForm,
  /currentVehicleDefinitionId=\{vehicle\?\.vehicleDefinitionId \?\? null\}/,
);
assert.doesNotMatch(editPage, /safeVehicleDefinitionSuggestions/);
assert.match(adminPage, /allowManual=\{false\}/);
assert.doesNotMatch(adminPage, /<select\s+name="vehicleDefinitionId"/);
assert.match(requestPage, /#garage-vehicle-/);
assert.match(submitButton, /disabled=\{pending\}/);
assert.match(mobileContract, /catalog = buildVehicleCatalogHierarchy/);
assert.match(mobileContract, /vehicleDefinitions,\s+catalog,/);
assert.match(garageService, /id: input\.vehicleDefinitionId/);
assert.match(garageService, /active: true/);
assert.match(schema, /vehicleDefinition\s+VehicleDefinition\?.+onDelete: SetNull/);
assert.doesNotMatch(seedText, /vehicleDefinition\.(?:delete|deleteMany)\(/);

console.log("Catalog hierarchy validation passed.");
console.log(`Definitions before: ${baselineRows.length}`);
console.log(`Definitions after: ${rows.length}`);
console.log(`Stable codes preserved: ${baselineCodes.size}/${baselineCodes.size}`);
console.log(`Reachable definitions: ${reachableCodes.size}`);
console.log(`Orphan definitions: ${orphanCodes.length}`);
console.log(`Duplicate stable codes: ${duplicateStableCodes.length}`);
console.log(`Duplicate hierarchy leaves: ${duplicateLeafPaths.length}`);
console.log(`Hierarchy brands: ${hierarchy.brands.length}`);

function toHierarchyInput(
  row: (typeof rows)[number],
): VehicleCatalogDefinitionInput {
  return {
    id: row.code,
    code: row.code,
    brand: row.brand,
    model: row.model,
    generation: row.generation,
    chassisCode: row.chassisCode,
    variant: row.variant,
  };
}

function flattenHierarchy(value: VehicleCatalogHierarchy) {
  return value.brands.flatMap((brand) =>
    brand.models.flatMap((model) =>
      model.generations.flatMap((generation) =>
        generation.variants.map((variant) => ({
          ...variant,
          pathKey: [brand.name, model.name, generation.name, variant.label].join(
            "\u0000",
          ),
        })),
      ),
    ),
  );
}

function assertCatalogPath(
  code: string,
  brand: string,
  modelFamily: string,
  generationFragment: string,
  variantFragment: string,
) {
  const path = findVehicleCatalogPath(hierarchy, code);
  assert.ok(path, code);
  assert.equal(path.brand, brand, code);
  assert.equal(path.modelFamily, modelFamily, code);
  assert.ok(path.generation.includes(generationFragment), code);
  assert.ok(path.variant.label.includes(variantFragment), code);
}

function assertOrdered(values: string[], expected: string[]) {
  const indexes = expected.map((value) => values.indexOf(value));
  assert.ok(indexes.every((index) => index >= 0), values.join(", "));
  assert.deepEqual(indexes, [...indexes].sort((left, right) => left - right));
}
