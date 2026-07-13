import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adminAuthorization = read("src/lib/admin-authorization.ts");
const adminShell = read("src/components/admin/admin-shell.tsx");
const adminDashboard = read("src/app/admin/page.tsx");
const adminExport = read("src/app/admin/export/route.ts");
const membersPage = read("src/app/admin/members/page.tsx");
const memberDetailPage = read("src/app/admin/members/[id]/page.tsx");
const garageActions = read("src/app/admin/members/[id]/garage-actions.ts");
const participantsPage = read("src/app/admin/participants/page.tsx");
const participantDetailPage = read("src/app/admin/participants/[id]/page.tsx");
const participantActions = read("src/app/admin/participants/[id]/actions.ts");
const adminCheckInPage = read("src/app/admin/check-in/page.tsx");
const adminCheckInActions = read("src/app/admin/check-in/actions.ts");
const qrCheckInPage = read("src/app/check-in/[token]/page.tsx");
const qrCheckInActions = read("src/app/check-in/[token]/actions.ts");
const checkInService = read("src/lib/check-in.ts");
const manualPaymentService = read("src/lib/manual-payment-confirmation.ts");

const ownerCapabilities = [
  "members.read",
  "garages.manage",
  "registrations.read",
  "registrations.manage",
  "payments.manage",
  "checkin.manage",
  "events.manage",
  "admins.manage",
];

for (const capability of ownerCapabilities) {
  assert.match(adminAuthorization, new RegExp(`"${escapeRegExp(capability)}"`));
}

assert.match(adminAuthorization, /role === "OWNER"/);
assert.match(adminAuthorization, /role === "CHECKIN"/);
assert.match(adminAuthorization, /role === "STAFF"/);
assert.match(adminAuthorization, /authSource: AdminAuthSource/);
assert.match(adminAuthorization, /session\.authSource === "OWNER_SESSION" && adminUser\.role !== "OWNER"/);
assert.match(adminAuthorization, /session\.authSource === "MEMBER_SESSION"/);
assert.match(adminAuthorization, /return noCapabilities/);
assert.match(adminAuthorization, /prisma\.adminUser\.findUnique/);
assert.match(adminAuthorization, /email: normalizeAdminEmail\(session\.email\)/);
assert.match(adminAuthorization, /!adminActor \|\| !adminHasCapability/);
assert.match(adminAuthorization, /redirect\(adminDeniedPath\(adminActor\)\)/);

const checkinCapabilityBlock = sliceBetween(
  adminAuthorization,
  "const checkinCapabilities",
  "const staffCapabilities",
);
assert.doesNotMatch(checkinCapabilityBlock, /"members\.read"/);
assert.match(checkinCapabilityBlock, /"registrations\.read"/);
assert.match(checkinCapabilityBlock, /"checkin\.manage"/);
assert.doesNotMatch(checkinCapabilityBlock, /"garages\.manage"/);
assert.doesNotMatch(checkinCapabilityBlock, /"payments\.manage"/);
assert.doesNotMatch(checkinCapabilityBlock, /"registrations\.manage"/);
assert.doesNotMatch(checkinCapabilityBlock, /"events\.manage"/);
assert.doesNotMatch(checkinCapabilityBlock, /"admins\.manage"/);

const staffCapabilityBlock = sliceBetween(
  adminAuthorization,
  "const staffCapabilities",
  "const noCapabilities",
);
assert.match(staffCapabilityBlock, /"members\.read"/);
assert.match(staffCapabilityBlock, /"registrations\.read"/);
assert.match(staffCapabilityBlock, /"checkin\.manage"/);
assert.doesNotMatch(staffCapabilityBlock, /"garages\.manage"/);
assert.doesNotMatch(staffCapabilityBlock, /"payments\.manage"/);
assert.doesNotMatch(staffCapabilityBlock, /"registrations\.manage"/);
assert.doesNotMatch(staffCapabilityBlock, /"events\.manage"/);
assert.doesNotMatch(staffCapabilityBlock, /"admins\.manage"/);

assert.match(adminShell, /adminHasCapability\(adminActor\?\.role, "members\.read"\)/);
assert.match(adminShell, /adminHasCapability\(adminActor\?\.role, "registrations\.read"\)/);
assert.match(adminShell, /adminHasCapability\(adminActor\?\.role, "checkin\.manage"\)/);
assert.match(adminShell, /isOwnerAdmin\(adminActor\?\.role\)/);
assert.match(adminShell, /Üyeler/u);
assert.match(adminShell, /Katılımcılar/u);
assert.match(adminShell, /Check-in/);
assert.match(adminShell, /Ekip ve Yetkiler/u);

assert.match(adminDashboard, /requireOwnerAdmin\(\)/);
assert.match(adminExport, /adminHasCapability\(adminActor\.role, "registrations\.manage"\)/);
assert.match(adminExport, /new NextResponse\("Forbidden", \{ status: 403 \}\)/);

assert.match(membersPage, /requireAdminCapability\("members\.read"\)/);
assert.match(membersPage, /includeVehicleSearch: canViewGarageData/);
assert.match(membersPage, /includeMarketingFilter: canViewGarageData/);
assert.match(membersPage, /memberSelect\.vehicles =/);
assert.match(membersPage, /memberSelect\.registrations =/);
assert.match(membersPage, /canViewGarageData \? "E-posta, ad, telefon veya plaka" : "E-posta, ad veya telefon"/);

const checkinMemberDetail = sliceBetween(
  memberDetailPage,
  "async function renderCheckinMemberDetail",
  "type AdminVehicleDefinitionOption",
);
assert.match(memberDetailPage, /requireAdminCapability\("members\.read"\)/);
assert.match(memberDetailPage, /adminHasCapability\(adminActor\.role, "garages\.manage"\)/);
assert.match(memberDetailPage, /return renderCheckinMemberDetail\(id\)/);
assert.match(checkinMemberDetail, /registrations:/);
assert.doesNotMatch(checkinMemberDetail, /vehicles:/);
assert.doesNotMatch(checkinMemberDetail, /VehicleList/);
assert.doesNotMatch(checkinMemberDetail, /Garage Support/);
assert.doesNotMatch(checkinMemberDetail, /calculateVehiclePerformanceRating/);
assert.doesNotMatch(checkinMemberDetail, /modifications/);

assert.match(participantsPage, /requireAdminCapability\("registrations\.read"\)/);
assert.match(participantDetailPage, /requireAdminCapability\("registrations\.read"\)/);
assert.match(participantDetailPage, /renderCheckinParticipantDetail\(id\)/);
const checkinParticipantDetail = sliceBetween(
  participantDetailPage,
  "async function renderCheckinParticipantDetail",
  "function ActionResultBanner",
);
assert.match(checkinParticipantDetail, /paymentStatus/);
assert.match(checkinParticipantDetail, /checkIns/);
assert.doesNotMatch(checkinParticipantDetail, /ParticipantActionModals/);
assert.doesNotMatch(checkinParticipantDetail, /payments:/);
assert.doesNotMatch(checkinParticipantDetail, /adminNoteEntries/);
assert.doesNotMatch(checkinParticipantDetail, /auditLogs/);
assert.doesNotMatch(checkinParticipantDetail, /emails:/);

assert.match(adminCheckInPage, /requireCheckinOrOwner\(\)/);
assert.match(adminCheckInActions, /requireCheckinOrOwner\(\)/);
assert.match(qrCheckInPage, /requireCheckinOrOwner\(returnPath\)/);
assert.match(qrCheckInActions, /requireCheckinOrOwner\(returnPath\)/);
assert.match(checkInService, /adminUserId: string/);
assert.doesNotMatch(checkInService, /adminUser\.upsert/);
assert.doesNotMatch(checkInService, /adminEmail/);

assert.match(garageActions, /requireAdminCapability\("garages\.manage"/);
assert.match(garageActions, /deniedPath: garageResultPath\(memberId, "admin_permission_denied"\)/);
assert.doesNotMatch(garageActions, /adminUser\.upsert/);
assert.doesNotMatch(garageActions, /adminUser\.create/);
assert.doesNotMatch(garageActions, /role === "STAFF"/);

assert.match(participantActions, /requireAdminCapability\("payments\.manage"\)/);
assert.match(participantActions, /requireAdminCapability\("registrations\.manage"\)/);
assert.doesNotMatch(participantActions, /adminUser\.upsert/);
assert.doesNotMatch(participantActions, /adminUser\.create/);
assert.doesNotMatch(participantActions, /ensureAdminUser/);
assert.match(manualPaymentService, /adminUserId: string/);
assert.doesNotMatch(manualPaymentService, /adminUser\.upsert/);
assert.doesNotMatch(manualPaymentService, /adminEmail/);

const capabilityExpectations = [
  ["OWNER", "members.read", true],
  ["OWNER", "garages.manage", true],
  ["OWNER", "payments.manage", true],
  ["CHECKIN", "members.read", false],
  ["CHECKIN", "registrations.read", true],
  ["CHECKIN", "checkin.manage", true],
  ["CHECKIN", "garages.manage", false],
  ["CHECKIN", "payments.manage", false],
  ["CHECKIN", "registrations.manage", false],
  ["CHECKIN", "events.manage", false],
  ["CHECKIN", "admins.manage", false],
  ["STAFF", "members.read", true],
  ["STAFF", "registrations.read", true],
  ["STAFF", "checkin.manage", true],
  ["STAFF", "garages.manage", false],
  ["STAFF", "payments.manage", false],
  ["STAFF", "registrations.manage", false],
  ["STAFF", "admins.manage", false],
  ["SUPPORT", "members.read", false],
  [null, "members.read", false],
] as const;

for (const [role, capability, expected] of capabilityExpectations) {
  assert.equal(
    hasCapability(role, capability),
    expected,
    `${String(role)} ${capability} capability`,
  );
}

console.log("Admin authorization validation passed.");

function read(path: string) {
  return readFileSync(path, "utf8");
}

function sliceBetween(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  assert.notEqual(startIndex, -1, `Missing start marker: ${start}`);
  assert.notEqual(endIndex, -1, `Missing end marker: ${end}`);

  return source.slice(startIndex, endIndex);
}

function hasCapability(role: unknown, capability: string) {
  if (role === "OWNER") {
    return ownerCapabilities.includes(capability);
  }

  if (role === "CHECKIN") {
    return ["registrations.read", "checkin.manage"].includes(capability);
  }

  if (role === "STAFF") {
    return ["members.read", "registrations.read", "checkin.manage"].includes(capability);
  }

  return false;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
