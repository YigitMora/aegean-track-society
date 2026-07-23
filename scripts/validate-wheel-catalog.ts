import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

import {
  isConcreteModificationLeaf,
  legacyWheelModificationCodes,
  legacyWheelModificationWarning,
} from "../src/lib/modification-catalog-metadata";
import {
  extractModificationRows,
  readRepoFile,
  type ModificationSeedRow,
} from "./catalog-source-utils";

const seed = readRepoFile("prisma/seed.ts");
const baselineSeed = execFileSync("git", ["show", "main:prisma/seed.ts"], {
  encoding: "utf8",
});
const wheelRows = extractModificationRows(seed).filter(isWheel);
const baselineWheelRows = extractModificationRows(baselineSeed).filter(isWheel);
const wheelCodes = new Set(wheelRows.map((row) => row.code));
const baselineWheelCodes = new Set(baselineWheelRows.map((row) => row.code));
const missingBaselineCodes = [...baselineWheelCodes].filter(
  (code) => !wheelCodes.has(code),
);
const selectableWheelRows = wheelRows.filter(isConcreteModificationLeaf);
const duplicateCodes = duplicates(wheelRows.map((row) => row.code));
const duplicateProducts = duplicates(
  selectableWheelRows.map((row) =>
    [row.brand, row.variant ?? row.name]
      .map((value) => value?.trim().toLocaleLowerCase("tr-TR") ?? "")
      .join("|"),
  ),
);
const baselineSpecificationCodes = wheelSpecificationCodes(baselineSeed);
const specificationCodes = wheelSpecificationCodes(seed);
const missingBaselineSpecifications = [...baselineSpecificationCodes].filter(
  (code) => !specificationCodes.has(code),
);
const baselineManufacturers = manufacturerSet(baselineWheelRows);
const manufacturers = manufacturerSet(wheelRows);
const metadata = readRepoFile("src/lib/modification-catalog-metadata.ts");
const presentation = readRepoFile("src/lib/modification-presentation.ts");
const selector = readRepoFile(
  "src/components/vehicle-modification-batch-selector.tsx",
);
const garagePage = readRepoFile("src/app/account/garage/[id]/page.tsx");
const mobileGarage = readRepoFile("src/lib/mobile-garage-detail.ts");

assert.equal(baselineWheelRows.length, 67);
assert.ok(wheelRows.length >= baselineWheelRows.length);
assert.equal(missingBaselineCodes.length, 0, missingBaselineCodes.join(", "));
assert.equal(
  missingBaselineSpecifications.length,
  0,
  missingBaselineSpecifications.join(", "),
);
assert.equal(duplicateCodes.length, 0, duplicateCodes.join(", "));
assert.equal(duplicateProducts.length, 0, duplicateProducts.join(", "));
assert.equal(legacyWheelModificationCodes.size, 4);
assert.equal(
  wheelRows.filter((row) => legacyWheelModificationCodes.has(row.code)).length,
  legacyWheelModificationCodes.size,
);
assert.equal(
  selectableWheelRows.some((row) => legacyWheelModificationCodes.has(row.code)),
  false,
);
assert.equal(
  legacyWheelModificationWarning,
  "Eski genel jant kaydı. Daha doğru rating için belirli bir marka ve model seçin.",
);
assert.match(metadata, /definition\.category === "WHEELS"/);
assert.match(presentation, /definition\.category === "WHEELS"[\s\S]*?return "wheel"/);
assert.match(selector, /!isWheelSelection/);
assert.match(selector, /label="Üretici"/);
assert.match(selector, /\? "Model"/);
assert.match(garagePage, /wheelProductModelLabel\(definition\)/);
assert.match(mobileGarage, /wheelProductModelLabel\(definition\)/);
assert.doesNotMatch(seed, /vehicleModification\.(?:delete|deleteMany)\(/);
assert.doesNotMatch(seed, /modificationDefinition\.(?:delete|deleteMany)\(/);

console.log("Wheel catalog validation passed.");
console.log(`Wheel definitions before: ${baselineWheelRows.length}`);
console.log(`Wheel definitions after: ${wheelRows.length}`);
console.log(
  `Existing wheel stable codes preserved: ${baselineWheelCodes.size}/${baselineWheelCodes.size}`,
);
console.log(
  `Existing wheel specifications preserved: ${baselineSpecificationCodes.size}/${baselineSpecificationCodes.size}`,
);
console.log(
  `Wheel manufacturers before/after: ${baselineManufacturers.size}/${manufacturers.size}`,
);
console.log(`Selectable concrete wheel leaves: ${selectableWheelRows.length}`);
console.log(`Legacy wheel entries: ${legacyWheelModificationCodes.size}`);
console.log(`Duplicate wheel codes: ${duplicateCodes.length}`);
console.log(`Duplicate wheel products: ${duplicateProducts.length}`);
console.log("Wheel hierarchy: Jant -> Üretici -> Model");
console.log("Existing build relation preservation: passed");

function isWheel(row: ModificationSeedRow) {
  return row.category === "WHEELS";
}

function wheelSpecificationCodes(source: string) {
  return new Set([
    ...Array.from(
      source.matchAll(/\bwheelSpec\("([^"]+)"/g),
      (match) => match[1],
    ),
    ...Array.from(
      source.matchAll(
        /\bmodificationCode: "(wheel_(?:lightweight|flow_formed|forged)_[^"]+_technical)"/g,
      ),
      (match) => match[1],
    ),
  ]);
}

function manufacturerSet(rows: ModificationSeedRow[]) {
  return new Set(
    rows
      .filter(isConcreteModificationLeaf)
      .flatMap((row) => (row.brand ? [row.brand] : [])),
  );
}

function duplicates(values: string[]) {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts)
    .filter(([, count]) => count > 1)
    .map(([value]) => value);
}
