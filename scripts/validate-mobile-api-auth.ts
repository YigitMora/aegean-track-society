import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import {
  getBearerTokenFromAuthorizationHeader,
  isAccessTokenExpired,
  mobileAuthErrorEnvelope,
  MobileAuthError,
} from "../src/lib/mobile-auth-contract";

assert.equal(
  getBearerTokenFromAuthorizationHeader("Bearer abc.def.ghi"),
  "abc.def.ghi",
);

assert.equal(
  getBearerTokenFromAuthorizationHeader("bearer abc.def.ghi"),
  "abc.def.ghi",
);

assertMobileAuthError(
  () => getBearerTokenFromAuthorizationHeader(null),
  "MOBILE_AUTH_MISSING_TOKEN",
);

assertMobileAuthError(
  () => getBearerTokenFromAuthorizationHeader("Basic abc.def.ghi"),
  "MOBILE_AUTH_INVALID_FORMAT",
);

assertMobileAuthError(
  () => getBearerTokenFromAuthorizationHeader("Bearer abc.def.ghi extra"),
  "MOBILE_AUTH_INVALID_FORMAT",
);

const nowMs = Date.UTC(2026, 0, 1, 12, 0, 0);

assert.equal(
  isAccessTokenExpired(jwtWithPayload({ exp: nowMs / 1000 - 1 }), nowMs),
  true,
);

assert.equal(
  isAccessTokenExpired(jwtWithPayload({ exp: nowMs / 1000 + 60 }), nowMs),
  false,
);

assert.equal(isAccessTokenExpired("not-a-jwt", nowMs), false);

assert.deepEqual(
  mobileAuthErrorEnvelope(new MobileAuthError("MOBILE_AUTH_EXPIRED_TOKEN")),
  {
    error: {
      code: "MOBILE_AUTH_EXPIRED_TOKEN",
      message: "Oturum süreniz doldu. Lütfen tekrar giriş yapın.",
    },
  },
);

const mobileAuthSource = readFileSync("src/lib/mobile-auth.ts", "utf8");
const mobileMeRouteSource = readFileSync("src/app/api/mobile/v1/me/route.ts", "utf8");
const mobileAuthDocs = readFileSync("docs/mobile-api-authentication.md", "utf8");

assert.match(mobileAuthSource, /supabase\.auth\.getUser\(accessToken\)/);
assert.match(mobileAuthSource, /headers\.set\("Cache-Control", "no-store"\)/);
assert.doesNotMatch(mobileAuthSource, /SERVICE_ROLE|service_role|SUPABASE_SERVICE/i);
assert.match(mobileMeRouteSource, /export const runtime = "nodejs"/);
assert.match(mobileMeRouteSource, /authenticateMobileMember\(request\)/);
assert.match(mobileAuthDocs, /Authorization: Bearer <access_token>/);
assert.match(mobileAuthDocs, /MOBILE_AUTH_EXPIRED_TOKEN/);

console.log("validate-mobile-api-auth passed");

function assertMobileAuthError(
  fn: () => unknown,
  code: ConstructorParameters<typeof MobileAuthError>[0],
) {
  assert.throws(
    fn,
    (error) => error instanceof MobileAuthError && error.code === code,
  );
}

function jwtWithPayload(payload: Record<string, unknown>) {
  return [
    base64Url(JSON.stringify({ alg: "none" })),
    base64Url(JSON.stringify(payload)),
    "signature",
  ].join(".");
}

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}
