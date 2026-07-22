import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  deriveMobileEventEligibility,
  parseMobileApplicationInput,
  presentApplicationStatus,
} from "../src/lib/event-applications";
import { MobileAuthError } from "../src/lib/mobile-auth";
import {
  mobileApplicationsContractHeader,
  mobileApplicationsContractVersion,
  mobileApplicationsErrorResponse,
  MobileApplicationsError,
} from "../src/lib/mobile-applications-contract";

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  validateStrictApplicationInput();
  validateEligibilityBoundaries();
  validateStatusPresentation();
  await validateStableErrorsAndHeaders();
  validateSourceSecurityAndTransactions();
  console.log("validate-mobile-applications-api passed (65 assertions)");
}

function validateStrictApplicationInput() {
  const valid = {
    vehicleId: "vehicle-id",
    experienceLevel: "INTERMEDIATE",
    emergencyContactName: "Test Contact",
    emergencyContactPhone: "0555 111 22 33",
    kvkkAccepted: true,
    liabilityWaiverAccepted: true,
  };
  assert.ok(parseMobileApplicationInput(valid));

  for (const forged of [
    { userId: "forged" },
    { email: "forged@example.com" },
    { price: "0.00" },
    { paymentStatus: "PAID" },
    { status: "CONFIRMED" },
    { participantCode: "forged" },
  ]) {
    assert.equal(parseMobileApplicationInput({ ...valid, ...forged }), null);
  }
  assert.equal(parseMobileApplicationInput({ ...valid, kvkkAccepted: false }), null);
  assert.equal(
    parseMobileApplicationInput({ ...valid, liabilityWaiverAccepted: false }),
    null,
  );
}

function validateEligibilityBoundaries() {
  const startsAt = new Date("2026-09-20T06:00:00.000Z");
  const base = {
    eventExists: true,
    eventStatus: "PUBLISHED",
    packageActive: true,
    startsAt,
    capacity: 10,
    reservedCount: 9,
    profileComplete: true,
    requiredConsentsComplete: true,
    activeVehicleCount: 1,
    hasExistingApplication: false,
    now: new Date("2026-09-20T05:59:59.999Z"),
  } as const;

  assert.deepEqual(deriveMobileEventEligibility(base), {
    eligible: true,
    reasons: [],
    availableActions: ["APPLY"],
  });
  assert.deepEqual(
    deriveMobileEventEligibility({ ...base, now: startsAt }).reasons,
    ["REGISTRATION_DEADLINE_PASSED"],
  );
  assert.deepEqual(
    deriveMobileEventEligibility({ ...base, reservedCount: 10 }).reasons,
    ["CAPACITY_REACHED"],
  );
  assert.deepEqual(
    deriveMobileEventEligibility({ ...base, eventStatus: "SOLD_OUT" }).reasons,
    ["REGISTRATION_NOT_OPEN"],
  );
  assert.deepEqual(
    deriveMobileEventEligibility({ ...base, eventStatus: "DRAFT" }).reasons,
    ["EVENT_NOT_PUBLISHED"],
  );
  assert.deepEqual(
    deriveMobileEventEligibility({ ...base, profileComplete: false }).reasons,
    ["PROFILE_INCOMPLETE"],
  );
  assert.deepEqual(
    deriveMobileEventEligibility({ ...base, requiredConsentsComplete: false })
      .reasons,
    ["REQUIRED_CONSENTS_INCOMPLETE"],
  );
  assert.deepEqual(
    deriveMobileEventEligibility({ ...base, activeVehicleCount: 0 }).reasons,
    ["NO_ACTIVE_VEHICLE"],
  );
  assert.deepEqual(
    deriveMobileEventEligibility({ ...base, hasExistingApplication: true })
      .reasons,
    ["EXISTING_APPLICATION"],
  );
}

function validateStatusPresentation() {
  assert.equal(
    presentApplicationStatus("PENDING_PAYMENT", "UNPAID").code,
    "AWAITING_MANUAL_PAYMENT",
  );
  assert.equal(
    presentApplicationStatus("PENDING_PAYMENT", "REVIEW").code,
    "PAYMENT_REVIEW",
  );
  assert.equal(
    presentApplicationStatus("CONFIRMED", "PAID").code,
    "CONFIRMED",
  );
  assert.equal(presentApplicationStatus("REJECTED", "UNPAID").code, "REJECTED");
  assert.equal(presentApplicationStatus("CANCELLED", "FAILED").code, "CANCELLED");
  assert.equal(
    presentApplicationStatus("LEGACY_UNKNOWN", "LEGACY_UNKNOWN").code,
    "STATUS_PENDING",
  );
}

async function validateStableErrorsAndHeaders() {
  const unauthorized = mobileApplicationsErrorResponse(
    new MobileAuthError("MOBILE_AUTH_INVALID_TOKEN"),
  );
  assert.equal(unauthorized.status, 401);
  assert.equal(unauthorized.headers.get("cache-control"), "no-store");
  assert.equal(unauthorized.headers.get("www-authenticate"), "Bearer");
  assert.equal(
    unauthorized.headers.get(mobileApplicationsContractHeader),
    mobileApplicationsContractVersion,
  );

  const conflict = mobileApplicationsErrorResponse(
    new MobileApplicationsError("MOBILE_APPLICATIONS_CAPACITY_REACHED"),
  );
  assert.equal(conflict.status, 409);
  assert.equal(conflict.headers.get("cache-control"), "no-store");
  assert.deepEqual(await conflict.json(), {
    error: {
      code: "MOBILE_APPLICATIONS_CAPACITY_REACHED",
      message: "Bu etkinlik paketinin kontenjanı dolu.",
    },
  });
}

function validateSourceSecurityAndTransactions() {
  const service = source("src/lib/event-applications.ts");
  const webRoute = source("src/app/api/registrations/route.ts");
  const routes = [
    "src/app/api/mobile/v1/events/route.ts",
    "src/app/api/mobile/v1/events/[slug]/route.ts",
    "src/app/api/mobile/v1/events/[slug]/applications/route.ts",
    "src/app/api/mobile/v1/applications/route.ts",
    "src/app/api/mobile/v1/applications/[applicationId]/route.ts",
    "src/app/api/mobile/v1/applications/[applicationId]/pass/route.ts",
  ].map(source);

  for (const route of routes) {
    assert.match(route, /authenticateMobileMember\(request\)/);
    assert.match(route, /runtime = "nodejs"/);
    assert.match(route, /mobileApplications(?:Json|Error)Response/);
  }
  const createRoute = routes[2];
  assert.ok(
    createRoute.indexOf("authenticateMobileMember(request)") <
      createRoute.indexOf("readRequestBody(request)"),
  );
  assert.ok(
    createRoute.indexOf("authenticateMobileMember(request)") <
      createRoute.indexOf("context.params"),
  );
  assert.match(service, /userId: memberUserId/);
  assert.match(service, /userId: currentMember\.id/);
  assert.match(service, /deletedAt: null/);
  assert.match(service, /TransactionIsolationLevel\.Serializable/);
  assert.match(service, /error\.code === "P2034"/);
  assert.match(service, /tx\.registration\.count/);
  assert.match(service, /tx\.registration\.create/);
  assert.match(service, /tx\.payment\.create/);
  assert.match(service, /provider: "MANUAL"/);
  assert.match(service, /carBrandModel: snapshotVehicle/);
  assert.match(service, /plateNumber: vehicle\.plateNumber/);
  assert.match(service, /participantCode: registration\.participantCode/);
  assert.doesNotMatch(service, /rawQrToken|qrTokenHash/);
  assert.match(webRoute, /createMemberEventApplication/);
}

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
