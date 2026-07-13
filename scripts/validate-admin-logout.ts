import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const logoutRoute = read("src/app/admin/logout/route.ts");
const adminAuth = read("src/lib/admin-auth.ts");
const supabaseServer = read("src/lib/supabase/server.ts");
const adminShell = read("src/components/admin/admin-shell.tsx");
const ownerLoginSubmit = read("src/app/admin/login/submit/route.ts");
const memberLoginRoute = read("src/app/admin/member-login/route.ts");

assert.match(logoutRoute, /export async function POST\(request: Request\)/);
assert.doesNotMatch(logoutRoute, /export async function (GET|PUT|PATCH|DELETE)/);
assert.match(logoutRoute, /const session = await safeGetAdminSession\(\)/);
assert.match(logoutRoute, /NextResponse\.redirect\(new URL\("\/admin\/login", request\.url\)/);
assert.match(logoutRoute, /expireAdminSessionCookieOnResponse\(response\)/);
assert.match(logoutRoute, /safeClearAdminSessionCookie\(\)/);
assert.match(logoutRoute, /session\?\.authSource === "MEMBER_SESSION"/);
assert.match(logoutRoute, /safeSignOutSupabaseMemberSession\(response\)/);
assert.match(logoutRoute, /supabase\?\.auth\.signOut\(\)/);
assert.match(logoutRoute, /return await getAdminSession\(\)/);
assert.match(logoutRoute, /return null/);
assert.doesNotMatch(logoutRoute, /prisma\./);
assert.doesNotMatch(logoutRoute, /adminUser\.(create|update|delete|upsert)/);
assert.doesNotMatch(logoutRoute, /user\.(create|update|delete|upsert)/);

const memberSessionBranch = sliceBetween(
  logoutRoute,
  'if (session?.authSource === "MEMBER_SESSION")',
  "return response;",
);
assert.match(memberSessionBranch, /safeSignOutSupabaseMemberSession\(response\)/);

const beforeMemberSessionBranch = logoutRoute.slice(
  0,
  logoutRoute.indexOf('if (session?.authSource === "MEMBER_SESSION")'),
);
assert.doesNotMatch(beforeMemberSessionBranch, /signOut/);

assert.match(adminAuth, /const adminCookieName = "atd_admin_session"/);
assert.match(adminAuth, /expireAdminSessionCookieOnResponse\(response: NextResponse\)/);
assert.match(adminAuth, /response\.cookies\.set\(adminCookieName, "", expiredAdminCookieOptions\("\/"\)\)/);
assert.match(adminAuth, /response\.cookies\.set\(adminCookieName, "", expiredAdminCookieOptions\("\/admin"\)\)/);
assert.match(adminAuth, /path,\n    expires: new Date\(0\),\n    maxAge: 0/);
assert.match(adminAuth, /httpOnly: true/);
assert.match(adminAuth, /sameSite: "lax"/);
assert.match(adminAuth, /secure: process\.env\.NODE_ENV === "production"/);

assert.match(supabaseServer, /createOptionalSupabaseRouteHandlerClient\(response: NextResponse\)/);
assert.match(supabaseServer, /response\.cookies\.set\(name, value, options\)/);
assert.match(supabaseServer, /cookieStore\.set\(name, value, options\)/);

assert.match(adminShell, /Çıkış Yap/u);
assert.doesNotMatch(adminShell, />\s*Logout\s*</);

assert.match(ownerLoginSubmit, /verifyAdminCredentials/);
assert.match(ownerLoginSubmit, /createAdminSessionCookie\(normalizedEmail\)/);
assert.doesNotMatch(ownerLoginSubmit, /adminUser\.(create|upsert)/);
assert.doesNotMatch(memberLoginRoute, /adminUser\.(create|upsert)/);
assert.match(memberLoginRoute, /getVerifiedSupabaseUser/);

console.log("Admin logout validation passed.");

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
