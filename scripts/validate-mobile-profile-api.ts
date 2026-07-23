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

const validBody = {
  fullName: "  Ada   Yılmaz  ",
  phone: "0555 123 45 67",
  displayName: "  Ada  Pist  ",
  memberKvkkAccepted: true,
  memberMarketingConsent: false,
  memberTermsAccepted: true,
};

const parsed = parseMobileProfileUpdateBody(validBody, {
  requireMissingConsents: true,
});
assert.deepEqual(parsed, {
  data: {
    fullName: "Ada Yılmaz",
    phone: "+90 555 123 45 67",
    displayName: "Ada Pist",
    memberMarketingConsent: false,
  },
  acceptedMissingConsents: true,
});

for (const forged of [
  { userId: "forged" },
  { email: "forged@example.com" },
  { role: "ADMIN" },
  { status: "ACTIVE" },
]) {
  assert.equal(
    parseMobileProfileUpdateBody(
      { ...validBody, ...forged },
      { requireMissingConsents: false },
    ),
    null,
  );
}
assert.equal(
  parseMobileProfileUpdateBody(
    { ...validBody, fullName: "" },
    { requireMissingConsents: false },
  ),
  null,
);
assert.equal(
  parseMobileProfileUpdateBody(
    { ...validBody, phone: "123" },
    { requireMissingConsents: false },
  ),
  null,
);
assert.equal(
  parseMobileProfileUpdateBody(
    { ...validBody, memberMarketingConsent: "yes" },
    { requireMissingConsents: false },
  ),
  null,
);
assert.equal(
  parseMobileProfileUpdateBody(
    { ...validBody, memberKvkkAccepted: false },
    { requireMissingConsents: true },
  ),
  null,
);

const invalid = mobileProfileErrorResponse(
  new MobileProfileError("MOBILE_PROFILE_INVALID_BODY"),
);
assert.equal(invalid.status, 422);
assert.equal(invalid.headers.get("cache-control"), "no-store");
assert.equal(
  invalid.headers.get(mobileProfileContractHeader),
  mobileProfileContractVersion,
);

const unauthorized = mobileProfileErrorResponse(
  new MobileAuthError("MOBILE_AUTH_INVALID_TOKEN"),
);
assert.equal(unauthorized.status, 401);
assert.equal(unauthorized.headers.get("www-authenticate"), "Bearer");
assert.equal(unauthorized.headers.get("cache-control"), "no-store");

const route = readFileSync("src/app/api/mobile/v1/me/route.ts", "utf8");
assert.ok(
  route.indexOf("authenticateMobileMember(request)") <
    route.indexOf("request.json()"),
  "Bearer authentication must happen before reading the update body.",
);
assert.doesNotMatch(route, /service.role|DATABASE_URL|userId\s*:/i);

const service = readFileSync("src/lib/member-profile-service.ts", "utf8");
assert.match(service, /where:\s*\{\s*userId: memberUser\.id/);
assert.match(service, /where:\s*\{\s*id: memberUser\.id/);

console.log("validate-mobile-profile-api passed (19 assertions)");
