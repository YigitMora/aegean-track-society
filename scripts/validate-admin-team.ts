import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adminTeamPage = read("src/app/admin/team/page.tsx");
const adminTeamActions = read("src/app/admin/team/actions.ts");
const adminShell = read("src/components/admin/admin-shell.tsx");
const adminAuthorization = read("src/lib/admin-authorization.ts");

assert.match(adminTeamPage, /export const dynamic = "force-dynamic"/);
assert.match(adminTeamPage, /requireOwnerAdmin\(\)/);
assert.match(adminTeamPage, /Ekip ve Yetkiler/u);
assert.match(adminTeamPage, /Sistem Sahibi hesabı korunmaktadır/u);
assert.match(adminTeamPage, /Yardımcı Admin/u);
assert.match(adminTeamPage, /Check-in Operatörü/u);
assert.match(adminTeamPage, /Üyeler, katılımcılar ve check-in/u);
assert.match(adminTeamPage, /Katılımcılar ve check-in/u);
assert.match(adminTeamPage, /Tüm sistem yetkileri/u);
assert.match(adminTeamPage, /ATS üyelik girişi/u);
assert.match(adminTeamPage, /Sistem sahibi girişi/u);
assert.match(adminTeamPage, /memberSelect/);
assert.doesNotMatch(adminTeamPage, /vehicles:/);
assert.doesNotMatch(adminTeamPage, /modifications/);
assert.doesNotMatch(adminTeamPage, /VehiclePerformanceRating/);
assert.doesNotMatch(adminTeamPage, /imagePath/);
assert.doesNotMatch(adminTeamPage, /garage/i);
assert.doesNotMatch(adminTeamPage, /<option value="OWNER"/);

assert.match(adminTeamActions, /requireOwnerAdmin\(\)/);
assert.match(adminTeamActions, /parseAssignableRole/);
assert.match(adminTeamActions, /value === "STAFF" \|\| value === "CHECKIN"/);
assert.match(adminTeamActions, /id: userId/);
assert.match(adminTeamActions, /deletedAt: null/);
assert.match(adminTeamActions, /prisma\.adminUser\.create/);
assert.match(adminTeamActions, /prisma\.adminUser\.update/);
assert.match(adminTeamActions, /prisma\.adminUser\.delete/);
assert.match(adminTeamActions, /existingAdmin\?\.role === "OWNER"/);
assert.match(adminTeamActions, /targetAdmin\.role === "OWNER"/);
assert.match(adminTeamActions, /confirmation !== normalizeAdminEmail\(targetAdmin\.email\)/);
assert.match(adminTeamActions, /ADMIN_ACCESS_GRANTED/);
assert.match(adminTeamActions, /ADMIN_ROLE_CHANGED/);
assert.match(adminTeamActions, /ADMIN_ACCESS_REVOKED/);
assert.match(adminTeamActions, /targetUserId/);
assert.match(adminTeamActions, /targetEmail/);
assert.match(adminTeamActions, /oldRole/);
assert.match(adminTeamActions, /newRole/);
assert.doesNotMatch(adminTeamActions, /prisma\.user\.update/);
assert.doesNotMatch(adminTeamActions, /prisma\.user\.delete/);
assert.doesNotMatch(adminTeamActions, /memberProfile\.(update|delete)/);
assert.doesNotMatch(adminTeamActions, /registration\.(update|delete|create)/);
assert.doesNotMatch(adminTeamActions, /vehicle\.(update|delete|create)/);
assert.doesNotMatch(adminTeamActions, /role:\s*"OWNER"/);

assert.match(adminShell, /href="\/admin\/team"/);
assert.match(adminShell, /Ekip ve Yetkiler/u);

assert.match(adminAuthorization, /requireOwnerAdmin/);
assert.match(adminAuthorization, /adminActor\.authSource !== "OWNER_SESSION"/);
assert.match(adminAuthorization, /"admins\.manage"/);

const teamErrorCodes = [
  "member_not_found",
  "admin_already_assigned",
  "invalid_role",
  "owner_protected",
  "admin_permission_denied",
  "member_admin_not_assigned",
  "confirmation_required",
  "failed",
];

for (const code of teamErrorCodes) {
  assert.match(adminTeamPage + adminTeamActions, new RegExp(code));
}

console.log("Admin team validation passed.");

function read(path: string) {
  return readFileSync(path, "utf8");
}
