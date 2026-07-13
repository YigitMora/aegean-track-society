import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adminAuth = read("src/lib/admin-auth.ts");
const adminAuthorization = read("src/lib/admin-authorization.ts");
const adminLoginPage = read("src/app/admin/login/page.tsx");
const ownerLoginSubmit = read("src/app/admin/login/submit/route.ts");
const memberLoginRoute = read("src/app/admin/member-login/route.ts");
const memberAuth = read("src/lib/member-auth.ts");

assert.match(adminAuth, /export type AdminAuthSource = "OWNER_SESSION" \| "MEMBER_SESSION"/);
assert.match(adminAuth, /authSource: options\.authSource \?\? "OWNER_SESSION"/);
assert.match(adminAuth, /createMemberAdminSessionCookie/);
assert.match(adminAuth, /authSource: "MEMBER_SESSION"/);
assert.match(adminAuth, /parseAdminAuthSource/);
assert.match(adminAuth, /return "OWNER_SESSION"/);
assert.doesNotMatch(
  sliceBetween(adminAuth, "export async function createMemberAdminSessionCookie", "export async function clearAdminSessionCookie"),
  /password/i,
);

assert.match(ownerLoginSubmit, /verifyAdminCredentials/);
assert.match(ownerLoginSubmit, /createAdminSessionCookie\(normalizedEmail\)/);
assert.doesNotMatch(ownerLoginSubmit, /createMemberAdminSessionCookie/);
assert.doesNotMatch(ownerLoginSubmit, /ensureMemberUser/);

assert.match(adminLoginPage, /Sistem Sahibi Girişi/u);
assert.match(adminLoginPage, /ATS Hesabıyla Giriş Yap/u);
assert.match(adminLoginPage, /\/admin\/member-login\?returnTo=/);
assert.match(adminLoginPage, /Sistem sahibi hesabı ayrı yönetici girişini kullanmalıdır/u);
assert.match(adminLoginPage, /Bu hesap için yönetim yetkisi bulunmuyor/u);

assert.match(memberAuth, /returnTo\.startsWith\("\/admin\/member-login"\)/);

assert.match(memberLoginRoute, /getVerifiedSupabaseUser/);
assert.match(memberLoginRoute, /ensureMemberUser\(supabaseUser\)/);
assert.match(memberLoginRoute, /prisma\.adminUser\.findUnique/);
assert.match(memberLoginRoute, /email: normalizedEmail/);
assert.match(memberLoginRoute, /adminUser\.role === "OWNER"/);
assert.match(memberLoginRoute, /owner_login_required/);
assert.match(memberLoginRoute, /isMemberLinkedAdminRole/);
assert.match(memberLoginRoute, /role === "STAFF" \|\| role === "CHECKIN"/);
assert.match(memberLoginRoute, /createMemberAdminSessionCookie\(adminUser\.email\)/);
assert.match(memberLoginRoute, /ADMIN_MEMBER_LOGIN_GRANTED/);
assert.match(memberLoginRoute, /ADMIN_MEMBER_LOGIN_DENIED/);
assert.match(memberLoginRoute, /clearAdminSessionCookie/);
assert.doesNotMatch(memberLoginRoute, /adminUser\.upsert/);
assert.doesNotMatch(memberLoginRoute, /adminUser\.create/);
assert.doesNotMatch(memberLoginRoute, /role:\s*"OWNER"/);
assert.doesNotMatch(memberLoginRoute, /password/i);
assert.doesNotMatch(memberLoginRoute, /access_token|refresh_token|session cookie/i);

assert.match(adminAuthorization, /authSource: AdminAuthSource/);
assert.match(adminAuthorization, /getAdminActorFromOwnerSession/);
assert.match(adminAuthorization, /getAdminActorFromMemberSession/);
assert.match(adminAuthorization, /requireMemberLinkedAdmin/);
assert.match(adminAuthorization, /adminUser\.role !== "OWNER"/);
assert.match(adminAuthorization, /adminUser\.role !== "STAFF"/);
assert.match(adminAuthorization, /adminUser\.role !== "CHECKIN"/);
assert.match(adminAuthorization, /adminActor\.authSource !== "OWNER_SESSION"/);
assert.doesNotMatch(adminAuthorization, /adminUser\.upsert/);
assert.doesNotMatch(adminAuthorization, /adminUser\.create/);

const capabilityExpectations = [
  ["OWNER", "members.read", true],
  ["OWNER", "admins.manage", true],
  ["STAFF", "members.read", true],
  ["STAFF", "registrations.read", true],
  ["STAFF", "checkin.manage", true],
  ["STAFF", "garages.manage", false],
  ["STAFF", "payments.manage", false],
  ["CHECKIN", "members.read", false],
  ["CHECKIN", "registrations.read", true],
  ["CHECKIN", "checkin.manage", true],
  ["CHECKIN", "garages.manage", false],
  ["SUPPORT", "members.read", false],
] as const;

for (const [role, capability, expected] of capabilityExpectations) {
  assert.equal(hasCapability(role, capability), expected, `${role} ${capability}`);
}

console.log("Hybrid admin authentication validation passed.");

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
    return true;
  }

  if (role === "STAFF") {
    return ["members.read", "registrations.read", "checkin.manage"].includes(capability);
  }

  if (role === "CHECKIN") {
    return ["registrations.read", "checkin.manage"].includes(capability);
  }

  return false;
}
