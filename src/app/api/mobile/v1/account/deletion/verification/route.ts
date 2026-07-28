import { authenticateMobileIdentity, mobileAuthErrorResponse, mobileAuthJsonResponse } from "@/lib/mobile-auth";
import { accountDeletionErrorResponse, deletionVerificationSchema } from "@/lib/mobile-account-deletion-contract";
import { startAccountDeletionVerification } from "@/lib/account-deletion-service";
import { AccountDeletionError } from "@/lib/mobile-account-deletion-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    deletionVerificationSchema.parse(await request.json().catch(() => null));
    const identity = await authenticateMobileIdentity(request);
    return mobileAuthJsonResponse(await startAccountDeletionVerification({ authUserId: identity.id, email: identity.email }));
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") return accountDeletionErrorResponse(new AccountDeletionError("ACCOUNT_DELETION_INVALID_BODY"));
    return error instanceof Error && error.name === "MobileAuthError"
      ? mobileAuthErrorResponse(error)
      : accountDeletionErrorResponse(error);
  }
}
