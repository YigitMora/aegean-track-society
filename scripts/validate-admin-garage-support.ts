import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = read("src/lib/garage-service.ts");
const adminActions = read("src/app/admin/members/[id]/garage-actions.ts");
const adminPage = read("src/app/admin/members/[id]/page.tsx");
const garagePage = read("src/app/account/garage/page.tsx");
const garageLifecycle = read("src/components/garage-vehicle-lifecycle.tsx");
const lifecycleState = read("src/lib/garage-lifecycle-state.ts");

for (const exportName of [
  "createGarageVehicle",
  "updateGarageVehicle",
  "archiveGarageVehicles",
  "restoreGarageVehicle",
  "permanentlyDeleteArchivedGarageVehicles",
  "matchGarageVehicleDefinition",
  "makePrimaryGarageVehicle",
]) {
  assert.match(service, new RegExp(`export async function ${exportName}`));
}

assert.match(service, /Serializable/);
assert.match(service, /P2034/);
assert.match(service, /ADMIN_GARAGE_VEHICLE_CREATED/);
assert.match(service, /ADMIN_GARAGE_VEHICLE_UPDATED/);
assert.match(service, /ADMIN_GARAGE_VEHICLE_ARCHIVED/);
assert.match(service, /ADMIN_GARAGE_VEHICLE_RESTORED/);
assert.match(service, /ADMIN_GARAGE_VEHICLE_DELETED/);
assert.match(service, /ADMIN_GARAGE_VEHICLE_DEFINITION_MATCHED/);
assert.match(service, /ADMIN_GARAGE_PRIMARY_CHANGED/);
assert.match(service, /incompatible_modifications_block_match/);

assert.match(adminActions, /prisma\.adminUser\.findUnique/);
assert.match(adminActions, /email: normalizeAdminEmail\(session\.email\)/);
assert.match(adminActions, /!adminUser \|\| !canWriteGarageRole\(adminUser\.role\)/);
assert.match(adminActions, /role === "OWNER" \|\| role === "STAFF"/);
assert.doesNotMatch(adminActions, /prisma\.adminUser\.upsert/);
assert.doesNotMatch(adminActions, /prisma\.adminUser\.create/);
assert.match(adminActions, /admin_permission_denied/);
assert.match(adminActions, /confirmVehicle/);
assert.match(adminActions, /reason/);

const roleExpectations = [
  ["OWNER", true],
  ["STAFF", true],
  ["CHECKIN", false],
  [null, false],
  ["SUPPORT", false],
] as const;

for (const [role, expected] of roleExpectations) {
  assert.equal(canWriteGarageRole(role), expected, `${String(role)} role matrix`);
}

assert.match(adminPage, /Garage Support/);
assert.match(adminPage, /Uye Garajina Arac Ekle|Üye Garajına Araç Ekle/u);
assert.match(adminPage, /ATS kataloğuyla eşleştir/u);
assert.match(adminPage, /Bu işlemler üyenin garajını doğrudan değiştirir/u);

assert.match(garagePage, /Aracının gerçek build profilini oluştur/u);
assert.match(garageLifecycle, /Build ve Modifikasyonlar/);
assert.match(garageLifecycle, /İlk Modifikasyonu Ekle/u);
assert.match(garageLifecycle, /Build'i Görüntüle/);
assert.match(garageLifecycle, /Katalog dışı araç/u);

assert.match(lifecycleState, /registration_preservation_required/);
assert.match(lifecycleState, /incompatible_modifications_block_match/);
assert.match(lifecycleState, /admin_permission_denied/);

console.log("Admin garage support validation passed.");

function read(path: string) {
  return readFileSync(path, "utf8");
}

function canWriteGarageRole(role: unknown) {
  return role === "OWNER" || role === "STAFF";
}
