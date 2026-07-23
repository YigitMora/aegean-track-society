import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MobileAuthError } from "../src/lib/mobile-auth";
import {
  mobileProfileContractHeader,
  mobileProfileContractVersion,
  mobileProfileErrorResponse,
  MobileProfileError,
  parseMobileProfileUpdateBody,
} from "../src/lib/mobile-profile-contract";
import { buildMobileMeResponseBody } from "../src/lib/mobile-me";
import {
  isCanonicalTurkishMobilePhone,
  normalizeTurkishPhone,
} from "../src/lib/registration-validation";

let assertionCount = 0;

const validBody = {
  fullName: "  Ada   Yılmaz  ",
  phone: "0555 123 45 67",
  displayName: "  Ada  Pist  ",
  memberKvkkAccepted: true,
  memberMarketingConsent: false,
  memberTermsAccepted: true,
};

const parsed = parseProfileBody();
expectDeepEqual(parsed, {
  data: {
    fullName: "Ada Yılmaz",
    phone: "+905551234567",
    displayName: "Ada Pist",
    memberMarketingConsent: false,
  },
  acceptedMissingConsents: true,
});

for (const acceptedPhone of [
  "+905551234567",
  "05551234567",
  "5551234567",
  "+90 555 123 45 67",
  "0090 (555) 123-45-67",
]) {
  expectEqual(normalizeTurkishPhone(acceptedPhone), "+905551234567");
  expectEqual(
    parseProfileBody({ phone: acceptedPhone })?.data.phone,
    "+905551234567",
  );
}
expectEqual(isCanonicalTurkishMobilePhone("+905551234567"), true);
expectEqual(isCanonicalTurkishMobilePhone("+90 555 123 45 67"), false);

for (const rejectedPhone of [
  "+904441234567",
  "555123456",
  "55512345678",
  "+495551234567",
  "+90 555 123 45 6a",
  "+90.555.123.45.67",
]) {
  expectEqual(normalizeTurkishPhone(rejectedPhone), "");
  expectEqual(parseProfileBody({ phone: rejectedPhone }), null);
}

for (const forged of [
  { userId: "forged" },
  { email: "forged@example.com" },
  { role: "ADMIN" },
  { status: "ACTIVE" },
]) {
  expectEqual(parseProfileBody(forged), null);
}
expectEqual(parseProfileBody({ fullName: "" }), null);
expectEqual(parseProfileBody({ phone: "123" }), null);
expectEqual(parseProfileBody({ memberMarketingConsent: "yes" }), null);
expectEqual(
  parseProfileBody({ memberKvkkAccepted: false }, true),
  null,
);

for (const acceptedLength of [119, 120]) {
  const fullName = "a".repeat(acceptedLength);
  expectEqual(parseProfileBody({ fullName })?.data.fullName, fullName);

  const displayName = "b".repeat(acceptedLength);
  expectEqual(parseProfileBody({ displayName })?.data.displayName, displayName);
}
expectEqual(parseProfileBody({ fullName: "a".repeat(121) }), null);
expectEqual(parseProfileBody({ displayName: "b".repeat(121) }), null);

const normalizedBoundaryName = `${"a".repeat(60)} ${"b".repeat(59)}`;
expectEqual(
  parseProfileBody({
    fullName: `  ${"a".repeat(60)}    ${"b".repeat(59)}  `,
  })?.data.fullName,
  normalizedBoundaryName,
);
expectEqual(normalizedBoundaryName.length, 120);
expectEqual(
  parseProfileBody({
    fullName: "a".repeat(121),
    displayName: "Valid display name",
  }),
  null,
  "A rejected field must prevent the complete profile payload from being applied.",
);

const mobileMeBody = buildMobileMeResponseBody({
  id: "member-1",
  email: "member@example.com",
  memberKvkkAcceptedAt: new Date(),
  memberTermsAcceptedAt: new Date(),
  memberMarketingConsentAt: null,
  memberMarketingConsentRevokedAt: null,
  profile: {
    fullName: "Ada Yılmaz",
    displayName: "Ada",
    phone: "+90 555 123 45 67",
  },
} as Parameters<typeof buildMobileMeResponseBody>[0]);
expectEqual(mobileMeBody.data.profile.phone, "+905551234567");

const invalid = mobileProfileErrorResponse(
  new MobileProfileError("MOBILE_PROFILE_INVALID_BODY"),
);
expectEqual(invalid.status, 422);
expectEqual(invalid.headers.get("cache-control"), "no-store");
expectEqual(
  invalid.headers.get(mobileProfileContractHeader),
  mobileProfileContractVersion,
);

const unauthorized = mobileProfileErrorResponse(
  new MobileAuthError("MOBILE_AUTH_INVALID_TOKEN"),
);
expectEqual(unauthorized.status, 401);
expectEqual(unauthorized.headers.get("www-authenticate"), "Bearer");
expectEqual(unauthorized.headers.get("cache-control"), "no-store");

const route = readFileSync("src/app/api/mobile/v1/me/route.ts", "utf8");
expectOk(
  route.indexOf("authenticateMobileMember(request)") <
    route.indexOf("request.json()"),
  "Bearer authentication must happen before reading the update body.",
);
expectOk(
  route.indexOf("const parsed = parseMobileProfileUpdateBody") <
    route.indexOf("const updatedMember = await updateMemberProfile"),
  "The complete profile body must validate before mutation.",
);
expectDoesNotMatch(route, /service.role|DATABASE_URL|userId\s*:/i);

const service = readFileSync("src/lib/member-profile-service.ts", "utf8");
expectMatch(service, /return prisma\.\$transaction/);
expectMatch(service, /where:\s*\{\s*userId: memberUser\.id/);
expectMatch(service, /where:\s*\{\s*id: memberUser\.id/);
expectDoesNotMatch(
  service,
  /console\.\w+\([\s\S]*?(?:memberUser|fullName|phone|email|token)/,
);

const profileAction = readFileSync(
  "src/app/account/profile/actions.ts",
  "utf8",
);
expectDoesNotMatch(profileAction, /AUTH_PROFILE_UPDATED|console\./);

const profileValidation = readFileSync(
  "src/lib/member-profile-validation.ts",
  "utf8",
);
expectDoesNotMatch(profileValidation, /\.slice\(0,\s*maxTextLength\)/);

const memberAuth = readFileSync("src/lib/member-auth.ts", "utf8");
expectDoesNotMatch(memberAuth, /normalized\.slice\(0,\s*120\)/);

const mobileMe = readFileSync("src/lib/mobile-me.ts", "utf8");
expectMatch(mobileMe, /normalizeTurkishPhone\(memberUser\.profile\.phone\)/);

const ciWorkflow = readFileSync(".github/workflows/ci.yml", "utf8");
expectMatch(
  ciWorkflow,
  /- name: Validate mobile profile API\s+run: pnpm validate:mobile-profile/,
);

console.log(
  `validate-mobile-profile-api passed (${assertionCount} assertions)`,
);

function parseProfileBody(
  overrides: Record<string, unknown> = {},
  requireMissingConsents = false,
) {
  return parseMobileProfileUpdateBody(
    { ...validBody, ...overrides },
    { requireMissingConsents },
  );
}

function expectEqual(
  actual: unknown,
  expected: unknown,
  message?: string,
) {
  assertionCount += 1;
  assert.equal(actual, expected, message);
}

function expectDeepEqual(
  actual: unknown,
  expected: unknown,
  message?: string,
) {
  assertionCount += 1;
  assert.deepEqual(actual, expected, message);
}

function expectOk(value: unknown, message?: string): asserts value {
  assertionCount += 1;
  assert.ok(value, message);
}

function expectMatch(value: string, expression: RegExp, message?: string) {
  assertionCount += 1;
  assert.match(value, expression, message);
}

function expectDoesNotMatch(
  value: string,
  expression: RegExp,
  message?: string,
) {
  assertionCount += 1;
  assert.doesNotMatch(value, expression, message);
}
