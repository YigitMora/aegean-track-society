export type PaymentMode = "manual" | "iyzico";

export function getPaymentMode(): PaymentMode {
  return process.env.PAYMENT_MODE === "iyzico" ? "iyzico" : "manual";
}

export function isIyzicoPaymentEnabled() {
  return getPaymentMode() === "iyzico";
}

export const manualReservationMessage =
  "Registration received. Our team will contact you for payment and confirmation.";
