import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseMobileApplicationInput } from "../src/lib/event-applications";
import {
  legacyMyTrackPaymentPreferenceLabel,
  myTrackPaymentPreferenceLabel,
  myTrackPaymentPreferenceOptions,
  myTrackPaymentPreferenceValues,
} from "../src/lib/mytrack-payment-preference";
import {
  memberEventRegistrationSchema,
  myTrackMemberEventRegistrationSchema,
} from "../src/lib/registration-validation";

const validApplication = {
  vehicleId: "vehicle-id",
  experienceLevel: "INTERMEDIATE",
  emergencyContactName: "Acil Kişi",
  emergencyContactPhone: "0555 111 22 33",
  kvkkAccepted: true,
  liabilityWaiverAccepted: true,
};

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}

function main() {
  assert.deepEqual(myTrackPaymentPreferenceValues, ["BANK_TRANSFER", "CARD_AT_TRACK"]);
  assert.deepEqual(myTrackPaymentPreferenceOptions, [
    { code: "BANK_TRANSFER", label: "MyTrack’e EFT / havale" },
    { code: "CARD_AT_TRACK", label: "Pistte kredi kartı" },
  ]);
  assert.equal(
    myTrackPaymentPreferenceLabel("BANK_TRANSFER"),
    "MyTrack’e EFT / havale",
  );
  assert.equal(myTrackPaymentPreferenceLabel("CARD_AT_TRACK"), "Pistte kredi kartı");
  assert.equal(myTrackPaymentPreferenceLabel(null), legacyMyTrackPaymentPreferenceLabel);
  assert.equal(memberEventRegistrationSchema.safeParse(validApplication).success, true);

  for (const paymentPreference of myTrackPaymentPreferenceValues) {
    const payload = { ...validApplication, paymentPreference };
    assert.deepEqual(myTrackMemberEventRegistrationSchema.parse(payload), payload);
    assert.deepEqual(parseMobileApplicationInput(payload), payload);
  }

  for (const invalidPaymentPreference of [undefined, null, "", "PAID", 42]) {
    const payload = { ...validApplication, paymentPreference: invalidPaymentPreference };
    assert.equal(myTrackMemberEventRegistrationSchema.safeParse(payload).success, false);
    assert.equal(parseMobileApplicationInput(payload), null);
  }
  for (const unsupportedPaymentField of [
    "iban",
    "bankAccount",
    "cardNumber",
    "cardholderName",
    "expiry",
    "cvv",
    "cvc",
    "paymentToken",
    "authorization",
  ]) {
    assert.equal(
      myTrackMemberEventRegistrationSchema.safeParse({
        ...validApplication,
        paymentPreference: "BANK_TRANSFER",
        [unsupportedPaymentField]: "not-accepted",
      }).success,
      false,
    );
  }

  const service = source("src/lib/event-applications.ts");
  const webRoute = source("src/app/api/registrations/route.ts");
  const mobileRoute = source("src/app/api/mobile/v1/events/[slug]/applications/route.ts");
  const form = source("src/components/registration-form.tsx");
  const email = source("src/lib/email.ts");
  const participants = source("src/app/admin/participants/page.tsx");
  const detail = source("src/app/admin/participants/[id]/page.tsx");
  const csv = source("src/app/admin/export/route.ts");

  assert.match(service, /myTrackMemberEventRegistrationSchema\.safeParse/);
  assert.match(service, /mytrackPaymentPreference: input\.paymentPreference/);
  assert.match(service, /paymentPreference: \{[\s\S]*code: registration\.mytrackPaymentPreference/);
  assert.match(webRoute, /myTrackMemberEventRegistrationSchema\.safeParse/);
  assert.match(webRoute, /mytrackPaymentPreference: input\.paymentPreference/);
  assert.match(mobileRoute, /paymentPreference: result\.email\.paymentPreference/);
  assert.match(form, /name="paymentPreference"/);
  assert.match(form, /ATS tahsilat yapmaz/);
  assert.doesNotMatch(form, /\b(?:iban|cvv|cardNumber|expiry)\b/i);
  assert.match(email, /MyTrack ödeme tercihi/);
  assert.match(participants, /myTrackPaymentPreference/);
  assert.match(participants, /groupBy\(/);
  assert.match(detail, /MyTrack ödeme tercihi/);
  assert.match(csv, /myTrackPaymentPreference/);

  const migration = source(
    "prisma/migrations/20260727193000_add_mytrack_payment_preference/migration.sql",
  );
  assert.match(migration, /ADD COLUMN "mytrackPaymentPreference"/);
  assert.doesNotMatch(migration, /\b(?:UPDATE|DELETE|TRUNCATE)\b/i);

  console.log("validate-mytrack-payment-preference passed");
}

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
