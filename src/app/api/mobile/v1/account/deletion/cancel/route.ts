import { authenticateMobileIdentity, mobileAuthErrorResponse, mobileAuthJsonResponse } from "@/lib/mobile-auth";
import { AccountDeletionError, accountDeletionErrorResponse, deletionCancellationSchema } from "@/lib/mobile-account-deletion-contract";
import { cancelAccountDeletion } from "@/lib/account-deletion-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    deletionCancellationSchema.parse(await request.json().catch(() => null));
    const identity = await authenticateMobileIdentity(request);
    return mobileAuthJsonResponse(await cancelAccountDeletion({ authUserId: identity.id }));
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return accountDeletionErrorResponse(new AccountDeletionError("ACCOUNT_DELETION_INVALID_BODY"));
    }
    return error instanceof Error && error.name === "MobileAuthError"
      ? mobileAuthErrorResponse(error)
      : accountDeletionErrorResponse(error);
  }
}
