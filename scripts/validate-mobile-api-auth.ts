import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import {
  AuthApiError,
  AuthRetryableFetchError,
  type User as SupabaseUser,
} from "@supabase/supabase-js";
import {
  authenticateMobileMember,
  mobileAuthErrorResponse,
  mobileJsonResponse,
  type MobileAuthDependencies,
  type MobileMemberUser,
} from "../src/lib/mobile-auth";
import {
  getBearerTokenFromAuthorizationHeader,
  isAccessTokenExpired,
  mobileAuthErrorEnvelope,
  MobileAuthError,
  type MobileAuthErrorCode,
} from "../src/lib/mobile-auth-contract";
import { buildMobileMeResponseBody } from "../src/lib/mobile-me";

const config = {
  url: "https://project.supabase.co",
  publishableKey: "test-publishable-key",
};
const verifiedSupabaseUser = {
  id: "4e59e2e2-8c1e-4fd3-a7f6-9d8b9d4a6f52",
  email: "member@example.com",
  email_confirmed_at: "2026-01-01T12:00:00.000Z",
  confirmed_at: "2026-01-01T12:00:00.000Z",
  app_metadata: {
    provider: "email",
  },
  aud: "authenticated",
  created_at: "2026-01-01T12:00:00.000Z",
  user_metadata: {
    privateSupabaseValue: "must-not-leak",
  },
} as SupabaseUser;
const activeMember = {
  id: verifiedSupabaseUser.id,
  email: verifiedSupabaseUser.email,
  role: "MEMBER",
  status: "ACTIVE",
  memberKvkkAcceptedAt: new Date("2026-01-01T12:00:00.000Z"),
  memberTermsAcceptedAt: new Date("2026-01-01T12:00:00.000Z"),
  memberMarketingConsentAt: new Date("2026-01-01T12:00:00.000Z"),
  memberMarketingConsentRevokedAt: null,
  memberConsentIpAddress: "192.0.2.1",
  deletedAt: null,
  createdAt: new Date("2026-01-01T12:00:00.000Z"),
  updatedAt: new Date("2026-01-01T12:00:00.000Z"),
  profile: {
    id: "internal-profile-id",
    userId: verifiedSupabaseUser.id,
    fullName: "Ada Yılmaz",
    displayName: "Ada",
    phone: "+90 555 123 45 67",
    emergencyContactName: "Must Not Leak",
    emergencyContactPhone: "+90 555 999 99 99",
    experienceLevel: null,
    profileCompletedAt: new Date("2026-01-01T12:00:00.000Z"),
    createdAt: new Date("2026-01-01T12:00:00.000Z"),
    updatedAt: new Date("2026-01-01T12:00:00.000Z"),
  },
} as MobileMemberUser;

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  console.log("validate-mobile-api-auth: bearer parsing");
  validateBearerParsing();
  console.log("validate-mobile-api-auth: expiration parsing");
  validateExpirationParsing();
  console.log("validate-mobile-api-auth: authentication failures");
  await validateAuthenticationFailures();
  console.log("validate-mobile-api-auth: safe response");
  await validateSuccessfulSafeResponse();
  console.log("validate-mobile-api-auth: response headers");
  await validateResponseHeadersAndEnvelope();
  console.log("validate-mobile-api-auth: source guards");
  validateSourceGuards();

  console.log("validate-mobile-api-auth passed");
}

function validateBearerParsing() {
  assert.equal(
    getBearerTokenFromAuthorizationHeader("Bearer abc.def.ghi"),
    "abc.def.ghi",
  );
  assert.equal(
    getBearerTokenFromAuthorizationHeader("bearer abc.def.ghi"),
    "abc.def.ghi",
  );

  assertSynchronousMobileAuthError(
    () => getBearerTokenFromAuthorizationHeader(null),
    "MOBILE_AUTH_MISSING_TOKEN",
    401,
  );
  assertSynchronousMobileAuthError(
    () => getBearerTokenFromAuthorizationHeader("Basic abc.def.ghi"),
    "MOBILE_AUTH_INVALID_FORMAT",
    401,
  );
  assertSynchronousMobileAuthError(
    () => getBearerTokenFromAuthorizationHeader("Bearer"),
    "MOBILE_AUTH_INVALID_FORMAT",
    401,
  );
  assertSynchronousMobileAuthError(
    () => getBearerTokenFromAuthorizationHeader("Bearer abc.def.ghi extra"),
    "MOBILE_AUTH_INVALID_FORMAT",
    401,
  );
}

function validateExpirationParsing() {
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
}

async function validateAuthenticationFailures() {
  let supabaseCalls = 0;
  const noHeaderDependencies = dependencies({
    getSupabaseUser: async () => {
      supabaseCalls += 1;
      return validSupabaseResult();
    },
  });

  await assertMobileAuthError(
    authenticateMobileMember(request(), noHeaderDependencies),
    "MOBILE_AUTH_MISSING_TOKEN",
    401,
  );
  await assertMobileAuthError(
    authenticateMobileMember(request("Basic token"), noHeaderDependencies),
    "MOBILE_AUTH_INVALID_FORMAT",
    401,
  );
  await assertMobileAuthError(
    authenticateMobileMember(request("Bearer"), noHeaderDependencies),
    "MOBILE_AUTH_INVALID_FORMAT",
    401,
  );
  await assertMobileAuthError(
    authenticateMobileMember(request("Bearer token extra"), noHeaderDependencies),
    "MOBILE_AUTH_INVALID_FORMAT",
    401,
  );
  assert.equal(supabaseCalls, 0, "malformed headers must not reach Supabase");

  let resolverCalls = 0;
  const invalidTokenDependencies = dependencies({
    getSupabaseUser: async () => ({
      data: { user: null },
      error: new AuthApiError("invalid", 401, "bad_jwt"),
    }),
    resolveMemberUser: async () => {
      resolverCalls += 1;
      return activeMember;
    },
  });

  await assertMobileAuthError(
    authenticateMobileMember(request("Bearer invalid-token"), invalidTokenDependencies),
    "MOBILE_AUTH_INVALID_TOKEN",
    401,
  );
  assert.equal(resolverCalls, 0, "invalid tokens must not reach Prisma provisioning");

  let expiredSupabaseCalls = 0;
  const expiredToken = jwtWithPayload({ exp: 1 });
  await assertMobileAuthError(
    authenticateMobileMember(
      request(`Bearer ${expiredToken}`),
      dependencies({
        getSupabaseUser: async () => {
          expiredSupabaseCalls += 1;
          return {
            data: { user: null },
            error: new AuthApiError("expired", 401, "bad_jwt"),
          };
        },
      }),
    ),
    "MOBILE_AUTH_EXPIRED_TOKEN",
    401,
  );
  assert.equal(expiredSupabaseCalls, 1, "expired tokens must still be checked by Supabase");

  let unverifiedResolverCalls = 0;
  await assertMobileAuthError(
    authenticateMobileMember(
      request("Bearer unverified-token"),
      dependencies({
        getSupabaseUser: async () =>
          validSupabaseResult({
            email_confirmed_at: undefined,
            confirmed_at: undefined,
          }),
        resolveMemberUser: async () => {
          unverifiedResolverCalls += 1;
          return activeMember;
        },
      }),
    ),
    "MOBILE_AUTH_EMAIL_UNVERIFIED",
    403,
  );
  assert.equal(
    unverifiedResolverCalls,
    0,
    "unverified users must not reach Prisma provisioning",
  );

  await assertMobileAuthError(
    authenticateMobileMember(
      request("Bearer suspended-token"),
      dependencies({
        resolveMemberUser: async () => ({
          ...activeMember,
          status: "SUSPENDED",
        }),
      }),
    ),
    "MOBILE_AUTH_ACCOUNT_SUSPENDED",
    403,
  );

  await assertMobileAuthError(
    authenticateMobileMember(
      request("Bearer unavailable-token"),
      dependencies({
        resolveMemberUser: async () => ({
          ...activeMember,
          deletedAt: new Date("2026-01-02T12:00:00.000Z"),
        }),
      }),
    ),
    "MOBILE_AUTH_ACCOUNT_UNAVAILABLE",
    403,
  );

  await assertMobileAuthError(
    authenticateMobileMember(
      request("Bearer configured-token"),
      dependencies({
        getSupabaseConfig: () => null,
      }),
    ),
    "MOBILE_AUTH_CONFIGURATION_ERROR",
    503,
  );

  await assertMobileAuthError(
    authenticateMobileMember(
      request("Bearer backend-token"),
      dependencies({
        getSupabaseUser: async () => ({
          data: { user: null },
          error: new AuthRetryableFetchError("network unavailable", 503),
        }),
      }),
    ),
    "MOBILE_AUTH_BACKEND_UNAVAILABLE",
    503,
  );

  await assertMobileAuthError(
    authenticateMobileMember(
      request("Bearer thrown-backend-token"),
      dependencies({
        getSupabaseUser: async () => {
          throw new Error("network unavailable");
        },
      }),
    ),
    "MOBILE_AUTH_BACKEND_UNAVAILABLE",
    503,
  );
}

async function validateSuccessfulSafeResponse() {
  const result = await authenticateMobileMember(
    request("Bearer valid-token"),
    dependencies(),
  );
  assert.equal(result.memberUser, activeMember);
  assert.equal(result.accessToken, "valid-token");

  const body = buildMobileMeResponseBody(result.memberUser);
  const expectedBody = {
    data: {
      member: {
        id: verifiedSupabaseUser.id,
        email: verifiedSupabaseUser.email,
      },
      profileComplete: true,
      requiredConsentsComplete: true,
      marketingConsent: true,
      profile: {
        fullName: "Ada Yılmaz",
        displayName: "Ada",
        phone: "+90 555 123 45 67",
      },
    },
  };

  assert.deepEqual(body, expectedBody);

  const response = mobileJsonResponse(body);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("WWW-Authenticate"), null);
  assert.deepEqual(await response.json(), expectedBody);
}

async function validateResponseHeadersAndEnvelope() {
  const expectedStatuses: ReadonlyArray<[MobileAuthErrorCode, number]> = [
    ["MOBILE_AUTH_MISSING_TOKEN", 401],
    ["MOBILE_AUTH_INVALID_FORMAT", 401],
    ["MOBILE_AUTH_INVALID_TOKEN", 401],
    ["MOBILE_AUTH_EXPIRED_TOKEN", 401],
    ["MOBILE_AUTH_EMAIL_UNVERIFIED", 403],
    ["MOBILE_AUTH_ACCOUNT_SUSPENDED", 403],
    ["MOBILE_AUTH_ACCOUNT_UNAVAILABLE", 403],
    ["MOBILE_AUTH_CONFIGURATION_ERROR", 503],
    ["MOBILE_AUTH_BACKEND_UNAVAILABLE", 503],
    ["MOBILE_AUTH_PROVISIONING_FAILED", 500],
    ["MOBILE_AUTH_INTERNAL_ERROR", 500],
  ];

  for (const [code, status] of expectedStatuses) {
    const error = new MobileAuthError(code, "unsafe override must not leak");
    const envelope = mobileAuthErrorEnvelope(error);
    const response = mobileAuthErrorResponse(error);

    assert.equal(error.status, status);
    assert.deepEqual(Object.keys(envelope), ["error"]);
    assert.deepEqual(Object.keys(envelope.error), ["code", "message"]);
    assert.equal(envelope.error.code, code);
    assert.notEqual(envelope.error.message, "unsafe override must not leak");
    assert.equal(response.status, status);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(
      response.headers.get("WWW-Authenticate"),
      status === 401 ? "Bearer" : null,
    );
    assert.deepEqual(await response.json(), envelope);
  }
}

function validateSourceGuards() {
  const mobileAuthSource = readFileSync("src/lib/mobile-auth.ts", "utf8");
  const memberAuthSource = readFileSync("src/lib/member-auth.ts", "utf8");
  const mobileMeRouteSource = readFileSync(
    "src/app/api/mobile/v1/me/route.ts",
    "utf8",
  );
  const mobileAuthDocs = readFileSync("docs/mobile-api-authentication.md", "utf8");

  assert.match(mobileAuthSource, /supabase\.auth\.getUser\(accessToken\)/);
  assert.match(mobileAuthSource, /request\.headers\.get\("authorization"\)/);
  assert.doesNotMatch(mobileAuthSource, /request\.(json|formData|text)\(/);
  assert.doesNotMatch(mobileAuthSource, /request\.(nextUrl|url)/);
  assert.match(mobileAuthSource, /headers\.set\("Cache-Control", "no-store"\)/);
  assert.match(mobileAuthSource, /"WWW-Authenticate": "Bearer"/);
  assert.doesNotMatch(mobileAuthSource, /SERVICE_ROLE|service_role|SUPABASE_SERVICE/i);
  assert.doesNotMatch(mobileAuthSource, /error\.message|error\.stack/);
  assert.match(mobileAuthSource, /await import\("@\/lib\/member-auth"\)/);
  assert.doesNotMatch(mobileAuthSource, /import \{ ensureMemberUser \}/);

  assert.match(memberAuthSource, /rejectUnavailableBeforeMutation/);
  assert.match(memberAuthSource, /existingUser\?\.status === "SUSPENDED"/);
  assert.match(memberAuthSource, /suppressProvisioningLogs/);

  assert.match(mobileMeRouteSource, /export const runtime = "nodejs"/);
  assert.match(mobileMeRouteSource, /export const dynamic = "force-dynamic"/);
  assert.match(mobileMeRouteSource, /authenticateMobileMember\(request\)/);
  assert.doesNotMatch(mobileMeRouteSource, /prisma|createClient|auth\.getUser/i);

  assert.match(mobileAuthDocs, /Authorization: Bearer <access_token>/);
  assert.match(mobileAuthDocs, /MOBILE_AUTH_BACKEND_UNAVAILABLE/);
  assert.match(mobileAuthDocs, /WWW-Authenticate: Bearer/);
}

function dependencies(
  overrides: Partial<MobileAuthDependencies> = {},
): MobileAuthDependencies {
  return {
    getSupabaseConfig: () => config,
    getSupabaseUser: async () => validSupabaseResult(),
    resolveMemberUser: async () => activeMember,
    ...overrides,
  };
}

function validSupabaseResult(overrides: Partial<SupabaseUser> = {}) {
  return {
    data: {
      user: {
        ...verifiedSupabaseUser,
        ...overrides,
      },
    },
    error: null,
  };
}

function request(authorization?: string) {
  const headers = new Headers();

  if (authorization !== undefined) {
    headers.set("Authorization", authorization);
  }

  return new Request("https://www.aegeantracksociety.com/api/mobile/v1/me", {
    headers,
  });
}

function assertSynchronousMobileAuthError(
  fn: () => unknown,
  code: MobileAuthErrorCode,
  status: number,
) {
  assert.throws(
    fn,
    (error) =>
      error instanceof MobileAuthError &&
      error.code === code &&
      error.status === status,
  );
}

async function assertMobileAuthError(
  promise: Promise<unknown>,
  code: MobileAuthErrorCode,
  status: number,
) {
  await assert.rejects(
    promise,
    (error) =>
      error instanceof MobileAuthError &&
      error.code === code &&
      error.status === status,
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
