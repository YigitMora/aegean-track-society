import { isIyzicoPaymentEnabled } from "./payment-mode";

export type ReadinessWarning = {
  title: string;
  body: string;
};

export function isIyzicoSandbox() {
  return (process.env.IYZICO_BASE_URL ?? "").toLowerCase().includes("sandbox");
}

export function getAdminReadinessWarnings({
  packagePriceIsZero,
  packageCapacity,
}: {
  packagePriceIsZero: boolean;
  packageCapacity: number;
}) {
  const warnings: ReadinessWarning[] = [];

  if (packagePriceIsZero) {
    warnings.push({
      title: "Package price is 0",
      body: "Set the real SEP20 package price before accepting production registrations.",
    });
  }

  if (packageCapacity === 0) {
    warnings.push({
      title: "Capacity is unlimited",
      body: "Set the real SEP20 capacity so registration reservations cannot exceed event limits.",
    });
  }

  if (isEmailProviderMissing()) {
    warnings.push({
      title: "Email provider is incomplete",
      body: "Configure EMAIL_PROVIDER, EMAIL_FROM, and Resend credentials before launch.",
    });
  }

  if (isIyzicoPaymentEnabled() && isIyzicoConfigMissing()) {
    warnings.push({
      title: "iyzico configuration is incomplete",
      body: "Configure iyzico API key, secret key, base URL, and NEXT_PUBLIC_APP_URL.",
    });
  }

  return warnings;
}

export function isEmailProviderMissing() {
  const provider = process.env.EMAIL_PROVIDER?.toLowerCase() || "resend";

  if (!process.env.EMAIL_FROM) {
    return true;
  }

  if (provider === "resend") {
    return !process.env.RESEND_API_KEY;
  }

  return true;
}

export function isIyzicoConfigMissing() {
  return [
    "IYZICO_API_KEY",
    "IYZICO_SECRET_KEY",
    "IYZICO_BASE_URL",
    "NEXT_PUBLIC_APP_URL",
  ].some((name) => !process.env[name]);
}
