import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  deriveMobileEventEligibility,
  parseMobileApplicationInput,
  presentCapacityTotal,
  presentEventWindow,
  presentApplicationStatus,
} from "../src/lib/event-applications";
import { getMobileEventDiscovery } from "../src/lib/mobile-event-discovery";
import {
  kulaEventPublicWindow,
  kulaEventScheduleItems,
} from "../src/lib/event-config";
import { MobileAuthError } from "../src/lib/mobile-auth";
import {
  mobileApplicationsContractHeader,
  mobileApplicationsContractVersion,
  mobileApplicationsErrorResponse,
  MobileApplicationsError,
} from "../src/lib/mobile-applications-contract";
import {
  mobileEventDiscoveryContractHeader,
  mobileEventDiscoveryContractVersion,
  mobileEventDiscoveryErrorResponse,
  mobileEventDiscoveryJsonResponse,
} from "../src/lib/mobile-event-discovery-contract";

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  validateStrictApplicationInput();
  validateEligibilityBoundaries();
  validateCapacityPresentation();
  validatePublicEventWindow();
  await validateEventDiscovery();
  validateStatusPresentation();
  await validateStableErrorsAndHeaders();
  validateSourceSecurityAndTransactions();
  console.log("validate-mobile-applications-api passed (103 assertions)");
}

function validateCapacityPresentation() {
  assert.equal(presentCapacityTotal(20), 20);
  assert.equal(presentCapacityTotal(0), null);
  assert.equal(presentCapacityTotal(null), null);
}

async function validateEventDiscovery() {
  const discovery = getMobileEventDiscovery("kula-mytrack-2026");
  assert.ok(discovery.data.discovery);
  const presentation = discovery.data.discovery;
  assert.match(presentation.hero.imagePath, /^\/images\/events\//);
  assert.equal(presentation.schedule[0]?.time, "08:30");
  assert.equal(presentation.schedule.at(-1)?.time, "17:30");
  assert.ok(presentation.experience.length > 0);
  assert.ok(presentation.requirements.length > 0);
  assert.ok(presentation.included.length > 0);
  assert.ok(presentation.faq.length > 0);
  assert.equal(getMobileEventDiscovery("future-event").data.discovery, null);

  const success = mobileEventDiscoveryJsonResponse(discovery);
  assert.equal(success.status, 200);
  assert.equal(success.headers.get("cache-control"), "no-store");
  assert.equal(
    success.headers.get(mobileEventDiscoveryContractHeader),
    mobileEventDiscoveryContractVersion,
  );

  const unauthorized = mobileEventDiscoveryErrorResponse(
    new MobileAuthError("MOBILE_AUTH_INVALID_TOKEN"),
  );
  assert.equal(unauthorized.status, 401);
  assert.equal(unauthorized.headers.get("www-authenticate"), "Bearer");
  assert.equal(unauthorized.headers.get("cache-control"), "no-store");
  assert.equal(
    unauthorized.headers.get(mobileEventDiscoveryContractHeader),
    mobileEventDiscoveryContractVersion,
  );
}

function validatePublicEventWindow() {
  assert.deepEqual(
    presentEventWindow({
      slug: "kula-mytrack-2026",
      startsAt: new Date("2026-09-20T03:00:00.000Z"),
      endsAt: new Date("2026-09-20T15:00:00.000Z"),
    }),
    kulaEventPublicWindow,
  );
  assert.equal(kulaEventScheduleItems[0].time, "08:30");
  assert.equal(kulaEventScheduleItems.at(-1)?.time, "17:30");
  assert.match(kulaEventPublicWindow.startsAt, /T08:30:00\+03:00$/);
  assert.match(kulaEventPublicWindow.endsAt, /T17:30:00\+03:00$/);

  assert.deepEqual(
    presentEventWindow({
      slug: "another-event",
      startsAt: new Date("2027-01-01T07:00:00.000Z"),
      endsAt: new Date("2027-01-01T15:00:00.000Z"),
    }),
    {
      startsAt: "2027-01-01T07:00:00.000Z",
      endsAt: "2027-01-01T15:00:00.000Z",
    },
  );
}

function validateStrictApplicationInput() {
  const valid = {
    vehicleId: "vehicle-id",
    experienceLevel: "INTERMEDIATE",
    emergencyContactName: "Test Contact",
    emergencyContactPhone: "0555 111 22 33",
    kvkkAccepted: true,
    liabilityWaiverAccepted: true,
    paymentPreference: "BANK_TRANSFER",
  };
  assert.deepEqual(parseMobileApplicationInput(valid), valid);
  assert.deepEqual(
    parseMobileApplicationInput({ ...valid, paymentPreference: "CARD_AT_TRACK" }),
    { ...valid, paymentPreference: "CARD_AT_TRACK" },
  );
  assert.equal(parseMobileApplicationInput({ ...valid, paymentPreference: undefined }), null);
  assert.equal(parseMobileApplicationInput({ ...valid, paymentPreference: null }), null);
  assert.equal(parseMobileApplicationInput({ ...valid, paymentPreference: "PAID" }), null);

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
  const eventDetailRoute = source(
    "src/app/api/mobile/v1/events/[slug]/route.ts",
  );
  const manualConfirmation = source("src/lib/manual-payment-confirmation.ts");
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
    assert.match(
      route,
      /mobile(?:Applications|EventDiscovery)(?:Json|Error)Response/,
    );
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
  assert.match(createRoute, /import \{ after \} from "next\/server"/);
  assert.match(createRoute, /after\(async \(\) => \{[\s\S]*Promise\.allSettled/);
  assert.ok(
    createRoute.indexOf("after(async () =>") <
      createRoute.lastIndexOf("return mobileApplicationsJsonResponse"),
  );
  assert.match(service, /userId: memberUserId/);
  assert.match(service, /userId: currentMember\.id/);
  assert.match(service, /deletedAt: null/);
  assert.match(service, /TransactionIsolationLevel\.Serializable/);
  assert.match(service, /error\.code === "P2034"/);
  assert.match(service, /tx\.registration\.count/);
  assert.match(
    eventDetailRoute,
    /getMobileEvent\([\s\S]*discoveryRequested[\s\S]*\)/,
  );
  assert.match(service, /tx\.registration\.create/);
  assert.match(service, /tx\.payment\.create/);
  assert.match(service, /provider: "MANUAL"/);
  assert.match(service, /carBrandModel: snapshotVehicle/);
  assert.match(service, /plateNumber: vehicle\.plateNumber/);
  assert.match(service, /participantCode: registration\.participantCode/);
  assert.doesNotMatch(service, /rawQrToken|qrTokenHash/);
  assert.match(webRoute, /createMemberEventApplication/);
  assert.match(service, /paymentPreference: input\.paymentPreference/);
  assert.match(service, /mytrackPaymentPreference: input\.paymentPreference/);
  assert.match(webRoute, /myTrackMemberEventRegistrationSchema/);

  const transactionNowIndex = service.indexOf("const transactionNow = clock()");
  assert.ok(transactionNowIndex > service.indexOf("tx.registration.count"));
  assert.ok(transactionNowIndex < service.indexOf("tx.registration.create"));
  assert.match(service, /tx\.registration\.findUniqueOrThrow/);
  assert.match(service, /error\.code !== "P2002"/);
  assert.match(service, /Registration_member_active_package_key/);
  assert.match(service, /MOBILE_APPLICATIONS_CREATE_FAILED/);
  assert.match(service, /price: paymentSnapshot[\s\S]*?: null/);
  assert.match(service, /"UNKNOWN" as const/);
  assert.match(service, /registration\.event\.status !== "DRAFT"/);
  assert.match(service, /registration\.event\.status !== "CANCELLED"/);

  const existingPaymentUpdate = manualConfirmation.match(
    /if \(existingManualPayment\) \{([\s\S]*?)\n        \} else \{/,
  );
  assert.ok(existingPaymentUpdate);
  assert.doesNotMatch(existingPaymentUpdate[1], /amount:/);
  assert.doesNotMatch(existingPaymentUpdate[1], /currency:/);
}

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
