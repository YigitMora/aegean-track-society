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

const baselineActiveDefinitions = 289;
const requiredAlfaCodes = [
  "alfa_romeo_mito_multiair_955",
  "alfa_romeo_mito_quadrifoglio_verde_955",
  "alfa_romeo_giulietta_multiair_940",
  "alfa_romeo_giulietta_qv_940",
  "alfa_romeo_giulietta_veloce_940",
  "alfa_romeo_giulia_20_turbo_952",
  "alfa_romeo_giulia_veloce_q4_952",
  "alfa_romeo_giulia_quadrifoglio_952",
  "alfa_romeo_stelvio_20_turbo_949",
  "alfa_romeo_stelvio_veloce_949",
  "alfa_romeo_stelvio_quadrifoglio_949",
  "alfa_romeo_tonale_hybrid_965",
  "alfa_romeo_tonale_phev_q4_965",
  "alfa_romeo_147_20_twin_spark_937",
  "alfa_romeo_147_gta_937",
  "alfa_romeo_156_20_twin_spark_932",
  "alfa_romeo_156_gta_932",
  "alfa_romeo_gt_32_v6_937",
  "alfa_romeo_brera_32_jts_q4_939",
  "alfa_romeo_4c_960",
  "alfa_romeo_4c_spider_960",
  "alfa_romeo_8c_competizione_920",
] as const;
const requiredFerrariCodes = [
  "ferrari_360_modena",
  "ferrari_f430",
  "ferrari_430_scuderia",
  "ferrari_458_italia",
  "ferrari_458_speciale",
  "ferrari_488_gtb",
  "ferrari_488_pista",
  "ferrari_f8_tributo",
  "ferrari_296_gtb",
  "ferrari_sf90_stradale",
  "ferrari_812_superfast",
  "ferrari_812_competizione",
  "ferrari_roma",
  "ferrari_portofino",
  "ferrari_california_t",
  "ferrari_laferrari",
] as const;
const requiredBrands = [
  "Alfa Romeo",
  "Ferrari",
  "Maserati",
  "Abarth",
  "Fiat",
  "MINI",
  "SEAT",
  "Cupra",
  "Skoda",
  "Volvo",
  "Polestar",
  "Jaguar",
  "Land Rover",
  "Aston Martin",
  "Lotus",
  "Opel",
  "Subaru",
  "Mitsubishi",
  "Mazda",
  "Suzuki",
  "Infiniti",
  "Genesis",
  "Dodge",
  "Cadillac",
  "Chevrolet",
] as const;

const seedText = readRepoFile("prisma/seed.ts");
const auditText = readRepoFile("docs/ats-vehicle-rating-audit.md");
const finalSpreads = extractSpreadArrayNames(seedText, "vehicleDefinitions");
const finalRows = extractFinalVehicleRows(seedText);
const expansionRows = extractVehicleRows(
  seedText,
  "productionCatalogExpansionVehicleDefinitions",
);
const beforeRows = finalRows.filter(
  (row) => row.arrayName !== "productionCatalogExpansionVehicleDefinitions",
);
const vehicleCodeCounts = countBy(finalRows.map((row) => row.code));
const duplicateCodes = Array.from(vehicleCodeCounts.entries()).filter(
  ([, count]) => count > 1,
);
const brandCounts = countBy(finalRows.map((row) => row.brand));
const beforeBrandCounts = countBy(beforeRows.map((row) => row.brand));
const finalCodes = new Set(finalRows.map((row) => row.code));
const familyLinkedCodes = new Set(
  extractFamilyLinks(seedText).map((link) => link.vehicleCode),
);
const normalizedBrandGroups = new Map<string, Set<string>>();
const comboCounts = countBy(
  finalRows.map((row) =>
    [row.brand, row.model, row.generation ?? "", row.variant ?? ""].join("|"),
  ),
);
const duplicateCombos = Array.from(comboCounts.entries()).filter(
  ([, count]) => count > 1,
);
const auditRows = Array.from(parseAuditRows(auditText).values());
const activeDefinitions = extractSummaryNumber(
  auditText,
  "Active vehicle definitions audited",
);
const reviewSignals = extractSummaryNumber(auditText, "Review-required signals");
const stock90 = auditRows.filter((row) => row.overall >= 90).length;
const stock95 = auditRows.filter((row) => row.overall >= 95).length;
const inferredDaily = auditRows.filter((row) => row.overall <= 75).length;
const inferredPerformance = auditRows.filter(
  (row) => row.overall > 75 && row.overall < 90,
).length;
const inferredElite = auditRows.filter((row) => row.overall >= 90).length;

for (const brand of brandCounts.keys()) {
  const normalized = brand.trim().toLowerCase();
  const group = normalizedBrandGroups.get(normalized) ?? new Set<string>();
  group.add(brand);
  normalizedBrandGroups.set(normalized, group);
}

const whitespaceOrCaseBrandDuplicates = Array.from(
  normalizedBrandGroups.values(),
).filter((group) => group.size > 1);

for (const arrayName of finalVehicleArrayNames) {
  assertCondition(
    finalSpreads.includes(arrayName),
    `vehicleDefinitions does not include ${arrayName}`,
  );
}

assertCondition(duplicateCodes.length === 0, `duplicate codes: ${duplicateCodes.join(", ")}`);
assertCondition(
  whitespaceOrCaseBrandDuplicates.length === 0,
  `brand spelling duplicates: ${whitespaceOrCaseBrandDuplicates
    .map((group) => Array.from(group).join(" / "))
    .join(", ")}`,
);
assertCondition(
  activeDefinitions === finalRows.length,
  `audit count ${activeDefinitions} does not match seed rows ${finalRows.length}`,
);
assertCondition(activeDefinitions > baselineActiveDefinitions, "active definitions did not grow");
assertCondition(reviewSignals === 0, `rating audit has ${reviewSignals} review signals`);

for (const brand of requiredBrands) {
  assertCondition((brandCounts.get(brand) ?? 0) > 0, `missing active brand ${brand}`);
}

for (const code of [...requiredAlfaCodes, ...requiredFerrariCodes]) {
  assertCondition(finalCodes.has(code), `missing required vehicle ${code}`);
  assertCondition(familyLinkedCodes.has(code), `missing family link for ${code}`);
}

const newBrands = Array.from(brandCounts.keys())
  .filter((brand) => !beforeBrandCounts.has(brand))
  .sort((first, second) => first.localeCompare(second));
const oneDefinitionBrands = Array.from(brandCounts.entries())
  .filter(([, count]) => count === 1)
  .map(([brand]) => brand)
  .sort((first, second) => first.localeCompare(second));
const fivePlusDefinitionBrands = Array.from(brandCounts.entries())
  .filter(([, count]) => count >= 5)
  .sort((first, second) => first[0].localeCompare(second[0]));

console.log(`Seed arrays in final upsert list: ${finalSpreads.join(", ")}`);
console.log(`Total active definitions before expansion: ${beforeRows.length}`);
console.log(`Total active definitions after expansion: ${finalRows.length}`);
console.log(`Baseline active definitions before this sprint: ${baselineActiveDefinitions}`);
console.log(`Active brand count before expansion: ${beforeBrandCounts.size}`);
console.log(`Active brand count after expansion: ${brandCounts.size}`);
console.log(`Alfa Romeo definitions: ${brandCounts.get("Alfa Romeo") ?? 0}`);
console.log(`Ferrari definitions: ${brandCounts.get("Ferrari") ?? 0}`);
console.log(`Production expansion definitions: ${expansionRows.length}`);
console.log(`New brands: ${newBrands.join(", ")}`);
console.log(
  `Definitions by brand: ${Array.from(brandCounts.entries())
    .sort((first, second) => first[0].localeCompare(second[0]))
    .map(([brand, count]) => `${brand}:${count}`)
    .join(", ")}`,
);
console.log(`Brands with only 1 definition: ${oneDefinitionBrands.join(", ") || "none"}`);
console.log(
  `Brands with 5+ definitions: ${fivePlusDefinitionBrands
    .map(([brand, count]) => `${brand}:${count}`)
    .join(", ")}`,
);
console.log(
  `Inferred daily/performance/elite counts: ${inferredDaily}/${inferredPerformance}/${inferredElite}`,
);
console.log(`Stock Overall >= 90: ${stock90}`);
console.log(`Stock Overall >= 95: ${stock95}`);
console.log(`Duplicate codes: ${duplicateCodes.length}`);
console.log(`Duplicate brand/model/generation/variant combinations: ${duplicateCombos.length}`);
console.log(`Review signals: ${reviewSignals}`);
