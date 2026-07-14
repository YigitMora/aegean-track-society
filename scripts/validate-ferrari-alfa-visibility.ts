import {
  assertCondition,
  extractFamilyLinks,
  extractFinalVehicleRows,
  readRepoFile,
} from "./catalog-source-utils";

const requiredVisibleCodes = [
  "alfa_romeo_giulia_quadrifoglio_952",
  "alfa_romeo_giulietta_qv_940",
  "alfa_romeo_4c_960",
  "ferrari_488_pista",
  "ferrari_458_speciale",
  "ferrari_sf90_stradale",
  "ferrari_f8_tributo",
  "ferrari_812_superfast",
] as const;

const seedText = readRepoFile("prisma/seed.ts");
const newVehiclePage = readRepoFile("src/app/account/garage/new/page.tsx");
const editVehiclePage = readRepoFile("src/app/account/garage/[id]/page.tsx");
const adminMemberPage = readRepoFile("src/app/admin/members/[id]/page.tsx");
const templateFields = readRepoFile("src/components/vehicle-template-fields.tsx");
const garageService = readRepoFile("src/lib/garage-service.ts");
const rows = extractFinalVehicleRows(seedText);
const rowsByCode = new Map(rows.map((row) => [row.code, row]));
const brandSet = new Set(rows.map((row) => row.brand));
const familyLinkedCodes = new Set(
  extractFamilyLinks(seedText).map((link) => link.vehicleCode),
);

assertCondition(
  newVehiclePage.includes("where: {\n      active: true,"),
  "new garage vehicle selector must query active definitions",
);
assertCondition(
  !newVehiclePage.includes("ratingStatus") &&
    !newVehiclePage.includes("compatibilities") &&
    !newVehiclePage.includes("modification"),
  "new garage vehicle selector must not filter by rating status or modification support",
);
assertCondition(
  editVehiclePage.includes("where: {\n        active: true,") ||
    editVehiclePage.includes("where: {\n      active: true,"),
  "edit garage vehicle selector must query active definitions",
);
assertCondition(
  adminMemberPage.includes("where: {\n          active: true,") ||
    adminMemberPage.includes("where: {\n        active: true,"),
  "admin garage vehicle selector must query active definitions",
);
assertCondition(
  templateFields.includes("new Set(definitions.map((definition) => definition.brand))"),
  "brand selector must derive exact active brand labels from definitions",
);
assertCondition(
  templateFields.includes("definition.brand === brand") &&
    templateFields.includes("definition.model === model"),
  "model selector must group by exact selected brand and model",
);
assertCondition(
  garageService.includes("active: true") &&
    garageService.includes("vehicleDefinitionId: definition.id"),
  "server-side garage service must enforce active vehicle definitions",
);
assertCondition(brandSet.has("Alfa Romeo"), "Alfa Romeo brand missing from seed rows");
assertCondition(brandSet.has("Ferrari"), "Ferrari brand missing from seed rows");
assertCondition(!brandSet.has("AlfaRomeo"), "AlfaRomeo duplicate brand spelling detected");
assertCondition(!brandSet.has("ferrari"), "lowercase Ferrari duplicate brand spelling detected");

for (const code of requiredVisibleCodes) {
  const row = rowsByCode.get(code);

  assertCondition(Boolean(row), `missing required visible code ${code}`);
  assertCondition(row?.active === true, `${code} is not active in seed assembly`);
  assertCondition(familyLinkedCodes.has(code), `${code} is missing a family link`);
  assertCondition(
    row?.ratingStatus !== "UNAVAILABLE",
    `${code} is unavailable and should not be used for selection proof`,
  );
}

console.log("PASS active vehicle creation selector has no rating-status filter");
console.log("PASS active vehicle creation selector has no modification-compatibility filter");
console.log("PASS exact Alfa Romeo and Ferrari brand labels are available");
console.log(`PASS visible representative codes: ${requiredVisibleCodes.join(", ")}`);
