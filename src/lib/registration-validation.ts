import { z } from "zod";
import { myTrackPaymentPreferenceValues } from "@/lib/mytrack-payment-preference";

const requiredText = (field: string) =>
  z
    .string({ required_error: `${field} is required.` })
    .trim()
    .min(1, `${field} is required.`);

const canonicalTurkishMobileRegex = /^\+905\d{9}$/;
const turkishPhoneInputRegex = /^\+?[\d\s()-]+$/;

export const experienceLevels = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "PROFESSIONAL",
] as const;

export const registrationSchema = z.object({
  fullName: requiredText("Full name").min(2, "Full name must be at least 2 characters."),
  phone: requiredText("Phone").refine(isValidTurkishPhone, {
    message: "Enter a valid Turkish phone number.",
  }),
  email: requiredText("Email").email("Enter a valid email address."),
  carBrandModel: requiredText("Car brand/model"),
  plateNumber: requiredText("Plate number"),
  experienceLevel: z.enum(experienceLevels, {
    required_error: "Driving experience level is required.",
  }),
  emergencyContactName: requiredText("Emergency contact name"),
  emergencyContactPhone: requiredText("Emergency contact phone").refine(isValidTurkishPhone, {
    message: "Enter a valid Turkish emergency contact phone number.",
  }),
  kvkkAccepted: z.literal(true, {
    errorMap: () => ({ message: "KVKK consent is required." }),
  }),
  liabilityWaiverAccepted: z.literal(true, {
    errorMap: () => ({ message: "Liability waiver acceptance is required." }),
  }),
  marketingConsent: z.boolean().optional().default(false),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const memberEventRegistrationSchema = z.object({
  vehicleId: requiredText("Vehicle").min(1, "Vehicle is required."),
  experienceLevel: z.enum(experienceLevels, {
    required_error: "Driving experience level is required.",
  }),
  emergencyContactName: requiredText("Emergency contact name")
    .min(2, "Emergency contact name must be at least 2 characters.")
    .max(120, "Emergency contact name is too long."),
  emergencyContactPhone: requiredText("Emergency contact phone").refine(isValidTurkishPhone, {
    message: "Enter a valid Turkish emergency contact phone number.",
  }),
  kvkkAccepted: z.literal(true, {
    errorMap: () => ({ message: "KVKK consent is required." }),
  }),
  liabilityWaiverAccepted: z.literal(true, {
    errorMap: () => ({ message: "Liability waiver acceptance is required." }),
  }),
});

export type MemberEventRegistrationInput = z.infer<typeof memberEventRegistrationSchema>;

export const myTrackMemberEventRegistrationSchema =
  memberEventRegistrationSchema
    .extend({
      paymentPreference: z.enum(myTrackPaymentPreferenceValues, {
        required_error: "MyTrack payment preference is required.",
        invalid_type_error: "MyTrack payment preference is invalid.",
      }),
    })
    .strict();

export type MyTrackMemberEventRegistrationInput = z.infer<
  typeof myTrackMemberEventRegistrationSchema
>;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizePlateNumber(plateNumber: string) {
  const compact = plateNumber.toLocaleUpperCase("tr-TR").replace(/[\s-]/g, "");
  const standardPlate = compact.match(
    /^(0[1-9]|[1-7][0-9]|8[01])([A-Z]{1,3})(\d{2,5})$/,
  );

  return standardPlate
    ? `${standardPlate[1]} ${standardPlate[2]} ${standardPlate[3]}`
    : null;
}

export function arePlateNumbersEquivalent(left: string, right: string) {
  const normalizedLeft = normalizePlateNumber(left);

  return normalizedLeft !== null && normalizedLeft === normalizePlateNumber(right);
}

export function normalizeTurkishPhone(phone: string) {
  const trimmed = phone.trim();

  if (!trimmed || !turkishPhoneInputRegex.test(trimmed)) {
    return "";
  }

  const compact = trimmed.replace(/[\s()-]/g, "");
  let digits: string;

  if (/^\+905\d{9}$/.test(compact)) {
    digits = compact.slice(1);
  } else if (/^00905\d{9}$/.test(compact)) {
    digits = compact.slice(2);
  } else {
    digits = compact;
  }

  let nationalNumber: string | null = null;

  if (digits.length === 12 && digits.startsWith("90")) {
    nationalNumber = digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    nationalNumber = digits.slice(1);
  }

  if (digits.length === 10) {
    nationalNumber = digits;
  }

  if (nationalNumber && /^5\d{9}$/.test(nationalNumber)) {
    return `+90${nationalNumber}`;
  }

  return "";
}

function isValidTurkishPhone(phone: string) {
  return isCanonicalTurkishMobilePhone(normalizeTurkishPhone(phone));
}

export function isCanonicalTurkishMobilePhone(phone: string) {
  return canonicalTurkishMobileRegex.test(phone);
}
