import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const actions = read("src/app/auth/actions.ts");
const callback = read("src/app/auth/callback/route.ts");
const confirm = read("src/app/auth/confirm/route.ts");
const configuration = read("docs/password-recovery-configuration.md");

const forgotAction = section(actions, "export async function forgotPasswordAction", "export async function resetPasswordAction");
const resetAction = section(actions, "export async function resetPasswordAction", "function isValidEmail");

assert.match(forgotAction, /resetPasswordForEmail\(email,/);
assert.match(forgotAction, /redirectTo: buildPublicAuthUrl\("\/auth\/confirm"\)/);
assert.doesNotMatch(forgotAction, /\/auth\/callback|next:\s*"\/auth\/reset-password"/);
assert.doesNotMatch(forgotAction, /emailDomain|errorName|errorMessage|serializeActionError|console\.log|console\.warn/);
assert.match(forgotAction, /console\.error\("AUTH_PASSWORD_RESET_REQUEST_FAILED"\);/);

assert.match(resetAction, /updateUser\(\{\s*password,\s*\}\)/);
assert.doesNotMatch(resetAction, /password\.trim\(|console\.warn|serializeActionError|errorName|errorMessage/);
assert.match(resetAction, /console\.error\("AUTH_PASSWORD_RESET_UPDATE_FAILED"\);/);

assert.match(confirm, /verifyOtp\(\{\s*token_hash: tokenHash,\s*type,/);
assert.match(confirm, /if \(type === "recovery"\) \{\s*return redirectTo\(request, "\/auth\/reset-password"\);/);
assert.doesNotMatch(confirm, /stack|token_hash=|errorMessage|console\.(?:log|warn)/);
assert.match(confirm, /console\.error\("AUTH_CONFIRM_FAILED"\);/);

assert.doesNotMatch(callback, /stack|code=|errorMessage|console\.(?:log|warn)/);
assert.match(callback, /console\.error\("AUTH_CALLBACK_FAILED"\);/);

assert.match(configuration, /\{\{ \.RedirectTo \}\}\?token_hash=\{\{ \.TokenHash \}\}&amp;type=recovery/);
assert.match(configuration, /https:\/\/www\.aegeantracksociety\.com\/auth\/confirm/);
assert.match(configuration, /aegeantracksociety:\/\/update-password/);
assert.match(configuration, /must not substitute `\{\{ \.SiteURL \}\}`/);

console.log("crossDeviceRecoveryUsesTokenHash=true");
console.log("recoveryLogsContainSensitiveValues=false");
console.log("webRecoveryRedirectIsCanonical=true");
console.log("requiredSupabaseTemplateDocumented=true");

function read(path: string) {
  return readFileSync(path, "utf8");
}

function section(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end);
  assert.notEqual(startIndex, -1, `Missing ${start}`);
  assert.notEqual(endIndex, -1, `Missing ${end}`);
  return source.slice(startIndex, endIndex);
}
