import "server-only";

export type AccountDeletionCompletedEmailPayload = {
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
};

export class AccountDeletionCompletedEmailError extends Error {
  constructor(
    readonly disposition: "RETRYABLE" | "RECONCILIATION_REQUIRED",
    readonly safeCode: "COMPLETION_EMAIL_FAILED" | "COMPLETION_EMAIL_CONCURRENT" | "COMPLETION_EMAIL_RECONCILIATION_REQUIRED",
  ) {
    super(safeCode);
  }
}

export async function sendAccountDeletionVerificationEmail(input: {
  to: string;
  code: string;
}) {
  return sendAccountDeletionEmail({
    to: input.to,
    subject: "ATS hesap silme doğrulama kodunuz",
    text: `Hesap silme doğrulama kodunuz: ${input.code}\nBu kod 10 dakika geçerlidir.`,
    html: `<p>Hesap silme doğrulama kodunuz:</p><p><strong>${input.code}</strong></p><p>Bu kod 10 dakika geçerlidir.</p>`,
  });
}

export function createAccountDeletionCompletedEmailPayload(to: string): AccountDeletionCompletedEmailPayload {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) throw new Error("ACCOUNT_DELETION_EMAIL_CONFIGURATION_ERROR");

  return {
    to,
    from,
    subject: "ATS hesabınız silindi",
    text: "ATS hesabınız ve silme kapsamındaki verileriniz kaldırıldı.",
    html: "<p>ATS hesabınız ve silme kapsamındaki verileriniz kaldırıldı.</p>",
  };
}

export async function sendAccountDeletionCompletedEmail(input: {
  payload: AccountDeletionCompletedEmailPayload;
  idempotencyKey: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new AccountDeletionCompletedEmailError("RETRYABLE", "COMPLETION_EMAIL_FAILED");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from: input.payload.from,
      to: [input.payload.to],
      subject: input.payload.subject,
      text: input.payload.text,
      html: input.payload.html,
    }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const providerCode = readProviderCode(body);
    if (response.status === 409 && providerCode === "concurrent_idempotent_requests") {
      throw new AccountDeletionCompletedEmailError("RETRYABLE", "COMPLETION_EMAIL_CONCURRENT");
    }
    if (response.status === 409 && providerCode === "invalid_idempotent_request") {
      throw new AccountDeletionCompletedEmailError("RECONCILIATION_REQUIRED", "COMPLETION_EMAIL_RECONCILIATION_REQUIRED");
    }
    throw new AccountDeletionCompletedEmailError("RETRYABLE", "COMPLETION_EMAIL_FAILED");
  }

  return { providerMessageId: readProviderMessageId(body) };
}

async function sendAccountDeletionEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    throw new Error("ACCOUNT_DELETION_EMAIL_CONFIGURATION_ERROR");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });

  if (!response.ok) {
    throw new Error("ACCOUNT_DELETION_EMAIL_DELIVERY_FAILED");
  }
}

function readProviderCode(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const code = record.name ?? record.code;
  return typeof code === "string" ? code : null;
}

function readProviderMessageId(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const id = (value as Record<string, unknown>).id;
  return typeof id === "string" ? id : null;
}
