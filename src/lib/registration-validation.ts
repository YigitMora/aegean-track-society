import { z } from "zod";

const requiredText = (field: string) =>
  z
    .string({ required_error: `${field} is required.` })
    .trim()
    .min(1, `${field} is required.`);

const phoneRegex = /^(?:(?:90)?[1-9]\d{9}|0[1-9]\d{9})$/;

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

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizePlateNumber(plateNumber: string) {
  return plateNumber.trim().replace(/\s+/g, " ").toUpperCase();
}

export function normalizeTurkishPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("90")) {
    return `+${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return `+90${digits.slice(1)}`;
  }

  if (digits.length === 10) {
    return `+90${digits}`;
  }

  return phone.trim();
}

function isValidTurkishPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return phoneRegex.test(digits);
}
