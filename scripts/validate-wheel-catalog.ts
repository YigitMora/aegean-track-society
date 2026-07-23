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
const mswP1 = requiredWheel("wheel_msw_p1");
const msw85 = requiredWheel("wheel_msw_85");
const mswRows = wheelRows.filter((row) => row.brand === "MSW");
const expectedMswExpansionCodes = [
  "wheel_msw_27",
  "wheel_msw_27t",
  "wheel_msw_28",
  "wheel_msw_29",
  "wheel_msw_40",
  "wheel_msw_41",
  "wheel_msw_41t",
  "wheel_msw_44",
  "wheel_msw_47",
  "wheel_msw_48",
  "wheel_msw_49",
  "wheel_msw_50",
  "wheel_msw_71",
  "wheel_msw_73",
  "wheel_msw_74",
  "wheel_msw_75",
  "wheel_msw_78",
  "wheel_msw_79",
  "wheel_msw_80_4",
  "wheel_msw_80_5",
  "wheel_msw_82",
  "wheel_msw_86",
  "wheel_msw_x2",
  "wheel_msw_x4",
] as const;
const motecRows = wheelRows.filter((row) => row.brand === "Motec");
const expectedMotecExpansionCodes = [
  "wheel_motec_mcf1_forged_one",
  "wheel_motec_mcr2_ultralight_dc",
  "wheel_motec_mcr3_hyper_mesh",
  "wheel_motec_mcr4_ultimate",
  "wheel_motec_mcr5_ultralight_evo",
  "wheel_motec_mcr6_jpd",
  "wheel_motec_mcr7_blaze",
  "wheel_motec_mcrf1_forged",
  "wheel_motec_mct1_antares",
  "wheel_motec_mct2_pantera",
  "wheel_motec_mct3_stream",
  "wheel_motec_mct4_penta",
  "wheel_motec_mct5_stryke",
  "wheel_motec_mct6_blade",
  "wheel_motec_mct7_xtreme",
  "wheel_motec_mct8_diamond",
  "wheel_motec_mct9_tornado",
  "wheel_motec_mct9r_tornado_revolution",
  "wheel_motec_mct10_radical",
  "wheel_motec_mct11_aventus",
  "wheel_motec_mct12_curve",
  "wheel_motec_mct13_supreme",
  "wheel_motec_mct14_gt_one",
  "wheel_motec_mct15_street",
  "wheel_motec_mct15a_aero_street",
  "wheel_motec_mct16_futura",
  "wheel_motec_mct17_bull",
  "wheel_motec_mct18_venom",
  "wheel_motec_mctc",
  "wheel_motec_mof1_r_cross",
] as const;
const expectedMajorManufacturerModels = new Map([
  ["HRE", ["FF10", "FF11"]],
  ["Borbet", ["Y", "GTX"]],
  ["Ronal", ["R62", "R70"]],
  ["Japan Racing", ["JR3", "JR11", "JR21"]],
  ["Fifteen52", ["Turbomac", "Podium"]],
  ["Konig", ["Hypergram", "Dekagram"]],
  ["WedsSport", ["TC105X", "SA-25R"]],
  ["ATS", ["StreetRallye", "Racelight"]],
  ["Autec", ["Wizard", "ClubRacing"]],
  ["Brock", ["B40", "B41"]],
  ["Rial", ["Lucca", "X10"]],
  ["Dezent", ["TZ", "TA"]],
] as const);

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
assert.equal(isConcreteModificationLeaf(mswP1), true);
assert.equal(isConcreteModificationLeaf(msw85), true);
assert.equal(mswP1.variant, "P1");
assert.equal(msw85.variant, "85");
assert.match(mswP1.source, /Regional\/distributor-confirmed/);
assert.match(mswP1.source, /8x18 5x112 ET48/);
assert.match(mswP1.source, /8x18 5x114\.3 ET45/);
assert.match(mswP1.source, /8\.5x19 5x112 ET44/);
assert.match(mswP1.source, /Gloss Black, Matt Graphite, and Bronze/);
assert.match(mswP1.source, /mass remain unverified/);
assert.equal(specificationCodes.has("wheel_msw_p1"), false);
assert.match(msw85.source, /one-piece cast 11-spoke/);
assert.match(msw85.source, /14-18 inches/);
assert.match(msw85.source, /6-8 inches wide/);
assert.match(msw85.source, /ET22-50/);
assert.match(
  seed,
  /wheelSpec\(\s*"wheel_msw_85",\s*"CAST",\s*52,\s*88,[\s\S]*?No universal mass is stored\./,
);
for (const row of [mswP1, msw85]) {
  assert.equal(row.powerImpact, 0);
  assert.equal(row.handlingImpact, 0);
  assert.equal(row.brakingImpact, 0);
  assert.equal(row.reliabilityImpact, 0);
  assert.equal(row.trackReadinessImpact, 0);
}
assert.equal(mswRows.length, 31);
for (const code of expectedMswExpansionCodes) {
  const row = requiredWheel(code);

  assert.equal(row.brand, "MSW");
  assert.equal(isConcreteModificationLeaf(row), true);
  assert.equal(row.powerImpact, 0);
  assert.equal(row.handlingImpact, 0);
  assert.equal(row.brakingImpact, 0);
  assert.equal(row.reliabilityImpact, 0);
  assert.equal(row.trackReadinessImpact, 0);
}
assert.match(requiredWheel("wheel_msw_75").source, /gravity-cast monoblock/);
assert.match(requiredWheel("wheel_msw_79").source, /16-18 inch/);
assert.match(requiredWheel("wheel_msw_80_4").source, /15-17 inch/);
assert.match(requiredWheel("wheel_msw_80_5").source, /16-19 inch/);
assert.equal(wheelCodes.has("wheel_msw_99_van"), false);
assert.equal(wheelCodes.has("wheel_msw_dr1"), false);
assert.equal(motecRows.length, 32);
assert.equal(requiredWheel("wheel_motec_ultralight").variant, "MCR2 Ultralight");
assert.equal(requiredWheel("wheel_motec_nitro").variant, "MCR1 Nitro");
for (const code of expectedMotecExpansionCodes) {
  const row = requiredWheel(code);

  assert.equal(row.brand, "Motec");
  assert.equal(isConcreteModificationLeaf(row), true);
  assert.equal(row.powerImpact, 0);
  assert.equal(row.handlingImpact, 0);
  assert.equal(row.brakingImpact, 0);
  assert.equal(row.reliabilityImpact, 0);
  assert.equal(row.trackReadinessImpact, 0);
}
for (const forgedCode of [
  "wheel_motec_mcf1_forged_one",
  "wheel_motec_mcrf1_forged",
]) {
  assert.equal(specificationCodes.has(forgedCode), true);
  assert.match(
    seed,
    new RegExp(
      `wheelSpec\\(\\s*"${forgedCode}",\\s*"FORGED"[\\s\\S]*?No universal mass is stored\\.`,
    ),
  );
}
for (const excludedRaceCode of [
  "wheel_motec_wm1_vantastic",
  "wheel_motec_mtcr",
  "wheel_motec_mcgt_race_gt",
  "wheel_motec_mcry_rallye",
  "wheel_motec_ta_082",
  "wheel_motec_mcf3",
  "wheel_motec_mcf4",
]) {
  assert.equal(wheelCodes.has(excludedRaceCode), false);
}
for (const [manufacturer, models] of expectedMajorManufacturerModels) {
  for (const model of models) {
    const row = wheelRows.find(
      (candidate) =>
        candidate.brand === manufacturer && candidate.variant === model,
    );

    assert.ok(row, `Missing ${manufacturer} ${model}`);
    assert.equal(isConcreteModificationLeaf(row), true);
    assert.equal(row.powerImpact, 0);
    assert.equal(row.handlingImpact, 0);
    assert.equal(row.brakingImpact, 0);
    assert.equal(row.reliabilityImpact, 0);
    assert.equal(row.trackReadinessImpact, 0);
  }
}
assert.equal(manufacturers.size, 27);
for (const code of [
  "wheel_hre_ff10",
  "wheel_hre_ff11",
  "wheel_fifteen52_turbomac",
  "wheel_fifteen52_podium",
  "wheel_konig_hypergram",
  "wheel_konig_dekagram",
  "wheel_autec_clubracing",
]) {
  assert.equal(specificationCodes.has(code), true);
}

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
console.log("MSW P1: selectable; regional/distributor-confirmed; neutral rating");
console.log("MSW 85: selectable; official one-piece cast metadata; neutral rating");
console.log(`MSW models: ${mswRows.length}`);
console.log(`MSW expansion models: ${expectedMswExpansionCodes.length}`);
console.log(`Motec models: ${motecRows.length}`);
console.log(`Motec expansion models: ${expectedMotecExpansionCodes.length}`);
console.log(
  `Major manufacturer models added: ${Array.from(expectedMajorManufacturerModels.values()).flat().length}`,
);
console.log("Wheel hierarchy: Jant -> Üretici -> Model");
console.log("Existing build relation preservation: passed");

function isWheel(row: ModificationSeedRow) {
  return row.category === "WHEELS";
}

function requiredWheel(code: string) {
  const row = wheelRows.find((candidate) => candidate.code === code);

  assert.ok(row, `Missing wheel definition: ${code}`);
  return row;
}

function wheelSpecificationCodes(source: string) {
  return new Set([
    ...Array.from(
      source.matchAll(/\bwheelSpec\(\s*"([^"]+)"/g),
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
