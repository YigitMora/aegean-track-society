import { execFileSync } from "node:child_process";

import {
  assertCondition,
  countBy,
  extractFamilyLinks,
  extractFinalVehicleRows,
  extractSpreadArrayNames,
  extractSummaryNumber,
  extractVehicleRows,
  finalVehicleArrayNames,
  parseAuditRows,
  readRepoFile,
} from "./catalog-source-utils";

const targetArrayNames = [
  "sprintVagGolfPoloVehicleDefinitions",
  "sprintFiatEgea124VehicleDefinitions",
  "sprintAudiCatalogVehicleDefinitions",
  "sprintMercedesBenzCatalogVehicleDefinitions",
  "sprintBmwCatalogVehicleDefinitions",
] as const;

const minimumArrayCounts: Record<(typeof targetArrayNames)[number], number> = {
  sprintVagGolfPoloVehicleDefinitions: 24,
  sprintFiatEgea124VehicleDefinitions: 21,
  sprintAudiCatalogVehicleDefinitions: 65,
  sprintMercedesBenzCatalogVehicleDefinitions: 90,
  sprintBmwCatalogVehicleDefinitions: 75,
};

const requiredCodesByGroup = {
  Volkswagen: [
    "volkswagen_golf_mk5_14_tsi_122",
    "volkswagen_golf_r32_mk5",
    "volkswagen_golf_mk75_15_tsi_150",
    "volkswagen_golf_gti_clubsport_s_mk7",
    "volkswagen_polo_gti_6c_18_tsi",
    "volkswagen_polo_aw_10_tsi_115",
  ],
  "Fiat/Abarth": [
    "fiat_egea_sedan_14_tjet",
    "fiat_egea_hatchback_15_hybrid",
    "fiat_egea_cross_16_multijet_130",
    "fiat_egea_sw_16_multijet",
    "fiat_124_spider_multiair",
    "abarth_124_spider",
    "abarth_124_gt",
  ],
  Audi: [
    "audi_s1_8x",
    "audi_a3_8y_20_tdi",
    "audi_rs4_b7",
    "audi_s5_8t",
    "audi_rs6_c8",
    "audi_rs7_c7",
    "audi_rs_q8_4m",
    "audi_e_tron_gt_j1",
    "audi_sq8_e_tron",
  ],
  "Mercedes-Benz": [
    "mercedes_a45_amg_w176",
    "mercedes_cla45_amg_c117",
    "mercedes_c63_amg_w204",
    "mercedes_e63_s_amg_w213",
    "mercedes_e53_hybrid_amg_w214",
    "mercedes_s63_e_performance_w223",
    "mercedes_glb250_x247",
    "mercedes_g63_amg_w463",
    "mercedes_sl55_amg_r230",
    "mercedes_amg_gt_r_c190",
    "mercedes_eqs53_amg",
  ],
  BMW: [
    "bmw_130i_e87",
    "bmw_128ti_f40",
    "bmw_330i_e46",
    "bmw_335i_e90",
    "bmw_550e_g60",
    "bmw_x5_50e_g05",
    "bmw_m3_e30",
    "bmw_m3_e46",
    "bmw_1m_e82",
    "bmw_m2_cs_f87",
    "bmw_m3_cs_g80",
    "bmw_m4_cs_g82",
    "bmw_m5_cs_f90",
    "bmw_m5_g90",
    "bmw_xm_g09",
  ],
} as const;

const canonicalTargetBrands = [
  "BMW",
  "Volkswagen",
  "Audi",
  "Mercedes-Benz",
  "Fiat",
  "Abarth",
] as const;

const disallowedVehicleBrands = new Set([
  "BMW M",
  "BMW-M",
  "Bmw",
  "Mercedes AMG",
  "Mercedes-AMG",
  "Audi Sport",
  "VW",
  "Fiat/Abarth",
]);

const seedText = readRepoFile("prisma/seed.ts");
const auditText = readRepoFile("docs/ats-vehicle-rating-audit.md");
const baselineSeedText = execFileSync("git", ["show", "main:prisma/seed.ts"], {
  encoding: "utf8",
});

const finalSpreads = extractSpreadArrayNames(seedText, "vehicleDefinitions");
const finalRows = extractFinalVehicleRows(seedText);
const baselineRows = extractRowsFromVehicleDefinitionSpreads(baselineSeedText);
const finalCodes = new Set(finalRows.map((row) => row.code));
const baselineCodes = new Set(baselineRows.map((row) => row.code));
const missingBaselineCodes = Array.from(baselineCodes).filter((code) => !finalCodes.has(code));
const targetRowsByArray = new Map(
  targetArrayNames.map((arrayName) => [arrayName, extractVehicleRows(seedText, arrayName)]),
);
const vehicleCodeCounts = countBy(finalRows.map((row) => row.code));
const duplicateCodes = Array.from(vehicleCodeCounts.entries()).filter(([, count]) => count > 1);
const comboCounts = countBy(
  finalRows.map((row) =>
    [row.brand, row.model, row.generation ?? "", row.variant ?? ""].join("|"),
  ),
);
const duplicateCombos = Array.from(comboCounts.entries()).filter(([, count]) => count > 1);
const brandCounts = countBy(finalRows.map((row) => row.brand));
const badBrandRows = finalRows.filter((row) => disallowedVehicleBrands.has(row.brand));
const familyLinks = extractFamilyLinks(seedText);
const familyLinkedCodes = new Set(familyLinks.map((link) => link.vehicleCode));
const missingFamilyLinks = finalRows
  .map((row) => row.code)
  .filter((code) => !familyLinkedCodes.has(code));
const platformCodes = new Set(
  Array.from(seedText.matchAll(/\bplatformFamily\("([^"]+)"/g), (match) => match[1]),
);
const engineCodes = new Set(
  Array.from(seedText.matchAll(/\bengineFamily\("([^"]+)"/g), (match) => match[1]),
);
const brokenFamilyLinks = familyLinks.filter(
  (link) =>
    (link.platformFamilyCode !== null && !platformCodes.has(link.platformFamilyCode)) ||
    (link.engineFamilyCode !== null && !engineCodes.has(link.engineFamilyCode)),
);
const auditActiveDefinitions = extractSummaryNumber(
  auditText,
  "Active vehicle definitions audited",
);
const reviewSignals = extractSummaryNumber(auditText, "Review-required signals");
const auditRows = Array.from(parseAuditRows(auditText).values());
const stock90 = auditRows.filter((row) => row.overall >= 90).length;
const stock95 = auditRows.filter((row) => row.overall >= 95).length;

for (const arrayName of finalVehicleArrayNames) {
  assertCondition(
    finalSpreads.includes(arrayName),
    `vehicleDefinitions does not include ${arrayName}`,
  );
}

for (const arrayName of targetArrayNames) {
  const rows = targetRowsByArray.get(arrayName) ?? [];
  assertCondition(
    rows.length >= minimumArrayCounts[arrayName],
    `${arrayName} has ${rows.length} rows, expected at least ${minimumArrayCounts[arrayName]}`,
  );
}

assertCondition(
  missingBaselineCodes.length === 0,
  `stable codes lost from main: ${missingBaselineCodes.join(", ")}`,
);
assertCondition(
  duplicateCodes.length === 0,
  `duplicate vehicle stable codes: ${duplicateCodes.map(([code]) => code).join(", ")}`,
);
assertCondition(
  duplicateCombos.length === 0,
  `duplicate brand/model/generation/variant combinations: ${duplicateCombos
    .map(([combo]) => combo)
    .join(", ")}`,
);
assertCondition(
  badBrandRows.length === 0,
  `disallowed vehicle brands: ${badBrandRows
    .map((row) => `${row.code}:${row.brand}`)
    .join(", ")}`,
);
assertCondition(
  missingFamilyLinks.length === 0,
  `missing vehicle family links: ${missingFamilyLinks.join(", ")}`,
);
assertCondition(
  brokenFamilyLinks.length === 0,
  `broken family links: ${brokenFamilyLinks
    .map((link) => `${link.vehicleCode}:${link.platformFamilyCode}/${link.engineFamilyCode}`)
    .join(", ")}`,
);
assertCondition(
  auditActiveDefinitions === finalRows.length,
  `audit count ${auditActiveDefinitions} does not match seed rows ${finalRows.length}`,
);
assertCondition(reviewSignals === 0, `rating audit has ${reviewSignals} review signals`);

for (const brand of canonicalTargetBrands) {
  assertCondition((brandCounts.get(brand) ?? 0) > 0, `missing target brand ${brand}`);
}

for (const [group, codes] of Object.entries(requiredCodesByGroup)) {
  for (const code of codes) {
    assertCondition(finalCodes.has(code), `missing required ${group} vehicle ${code}`);
    assertCondition(familyLinkedCodes.has(code), `missing family link for ${group} vehicle ${code}`);
  }
}

for (const row of targetRowsByArray.get("sprintVagGolfPoloVehicleDefinitions") ?? []) {
  assertCondition(row.brand === "Volkswagen", `${row.code} must use Volkswagen brand`);
}

for (const row of targetRowsByArray.get("sprintFiatEgea124VehicleDefinitions") ?? []) {
  assertCondition(
    row.brand === "Fiat" || row.brand === "Abarth",
    `${row.code} must use Fiat or Abarth brand`,
  );
}

for (const row of targetRowsByArray.get("sprintAudiCatalogVehicleDefinitions") ?? []) {
  assertCondition(row.brand === "Audi", `${row.code} must use Audi brand`);
}

for (const row of targetRowsByArray.get("sprintMercedesBenzCatalogVehicleDefinitions") ?? []) {
  assertCondition(row.brand === "Mercedes-Benz", `${row.code} must use Mercedes-Benz brand`);
}

for (const row of targetRowsByArray.get("sprintBmwCatalogVehicleDefinitions") ?? []) {
  assertCondition(row.brand === "BMW", `${row.code} must use BMW brand`);
}

console.log("VAG/Fiat/Audi/Mercedes/BMW catalog validation passed.");
console.log(`Seed arrays in final upsert list: ${finalSpreads.join(", ")}`);
console.log(`Main stable codes preserved: ${baselineCodes.size}/${baselineCodes.size}`);
console.log(`Active definitions on main: ${baselineRows.length}`);
console.log(`Active definitions after expansion: ${finalRows.length}`);
console.log(`Net added definitions: ${finalRows.length - baselineRows.length}`);
console.log(
  `Expansion array counts: ${targetArrayNames
    .map((arrayName) => `${arrayName}:${targetRowsByArray.get(arrayName)?.length ?? 0}`)
    .join(", ")}`,
);
console.log(
  `Target brand counts: ${canonicalTargetBrands
    .map((brand) => `${brand}:${brandCounts.get(brand) ?? 0}`)
    .join(", ")}`,
);
console.log(`Duplicate stable codes: ${duplicateCodes.length}`);
console.log(`Duplicate brand/model/generation/variant combinations: ${duplicateCombos.length}`);
console.log(`Missing family links: ${missingFamilyLinks.length}`);
console.log(`Broken family links: ${brokenFamilyLinks.length}`);
console.log(`Audit active definitions: ${auditActiveDefinitions}`);
console.log(`Review signals: ${reviewSignals}`);
console.log(`Stock Overall >= 90: ${stock90}`);
console.log(`Stock Overall >= 95: ${stock95}`);

function extractRowsFromVehicleDefinitionSpreads(source: string) {
  return extractSpreadArrayNames(source, "vehicleDefinitions").flatMap((arrayName) =>
    extractVehicleRows(source, arrayName).map((row) => ({
      ...row,
      arrayName,
      active: true,
    })),
  );
}
