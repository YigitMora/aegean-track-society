import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { mobileAuthJsonResponse } from "@/lib/mobile-auth";

export const accountDeletionConfirmation = "DELETE_MY_ACCOUNT";
export const accountDeletionAcknowledgementVersion = "account-deletion-v1";

export const deletionVerificationSchema = z.object({}).strict();
export const deletionConfirmationSchema = z.object({
  confirmation: z.literal(accountDeletionConfirmation),
  acknowledgementVersion: z.literal(accountDeletionAcknowledgementVersion),
  verificationCode: z.string().regex(/^\d{6}$/),
  idempotencyKey: z.string().uuid(),
}).strict();

const definitions = {
  ACCOUNT_DELETION_INVALID_BODY: [422, "Silme isteği geçerli değil."],
  ACCOUNT_DELETION_VERIFICATION_INVALID: [422, "Doğrulama kodu geçersiz veya süresi dolmuş."],
  ACCOUNT_DELETION_VERIFICATION_LIMITED: [429, "Doğrulama isteği sınırına ulaştınız. Lütfen daha sonra tekrar deneyin."],
  ACCOUNT_DELETION_NOT_READY: [409, "Hesap silme doğrulaması tamamlanmadı."],
  ACCOUNT_DELETION_IN_PROGRESS: [409, "Hesap silme işlemi sürüyor."],
  ACCOUNT_DELETION_CONFIGURATION_ERROR: [503, "Hesap silme şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin."],
  ACCOUNT_DELETION_STORAGE_FAILED: [503, "Hesap silme işlemi şu anda tamamlanamadı. Lütfen daha sonra tekrar deneyin."],
  ACCOUNT_DELETION_RETRY_REQUIRED: [503, "Hesap silme işlemi güvenli olarak tamamlanmayı bekliyor. Lütfen daha sonra tekrar deneyin."],
  ACCOUNT_DELETION_INTERNAL_ERROR: [500, "Hesap silme işlemi şu anda tamamlanamadı. Lütfen daha sonra tekrar deneyin."],
} as const;

export type AccountDeletionErrorCode = keyof typeof definitions;

export class AccountDeletionError extends Error {
  readonly status: number;
  constructor(readonly code: AccountDeletionErrorCode) {
    super(code);
    this.status = definitions[code][0];
  }
}

export function accountDeletionErrorResponse(error: unknown) {
  if (error instanceof AccountDeletionError) {
    const [status, message] = definitions[error.code];
    return mobileAuthJsonResponse({ error: { code: error.code, message } }, { status });
  }
  console.error("ACCOUNT_DELETION_UNHANDLED_ERROR");
  const [status, message] = definitions.ACCOUNT_DELETION_INTERNAL_ERROR;
  return mobileAuthJsonResponse({ error: { code: "ACCOUNT_DELETION_INTERNAL_ERROR", message } }, { status });
}

export function accountDeletionHash(value: string) {
  const pepper = process.env.ACCOUNT_DELETION_CODE_PEPPER?.trim();
  if (!pepper) throw new AccountDeletionError("ACCOUNT_DELETION_CONFIGURATION_ERROR");
  return createHash("sha256").update(`${pepper}:${value}`).digest("hex");
}

export function equalAccountDeletionHash(expected: string, value: string) {
  const actual = accountDeletionHash(value);
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
}
