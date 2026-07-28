import { authenticateMobileIdentity, mobileAuthErrorResponse, mobileAuthJsonResponse } from "@/lib/mobile-auth";
import { accountDeletionErrorResponse, deletionConfirmationSchema } from "@/lib/mobile-account-deletion-contract";
import { confirmAccountDeletion, getAccountDeletionStatus } from "@/lib/account-deletion-service";
import { AccountDeletionError } from "@/lib/mobile-account-deletion-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const identity = await authenticateMobileIdentity(request);
    return mobileAuthJsonResponse(await getAccountDeletionStatus(identity.id));
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") return accountDeletionErrorResponse(new AccountDeletionError("ACCOUNT_DELETION_INVALID_BODY"));
    return error instanceof Error && error.name === "MobileAuthError"
      ? mobileAuthErrorResponse(error)
      : accountDeletionErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = deletionConfirmationSchema.parse(await request.json().catch(() => null));
    const identity = await authenticateMobileIdentity(request);
    return mobileAuthJsonResponse(
      await confirmAccountDeletion({ authUserId: identity.id, email: identity.email, ...body }),
    );
  } catch (error) {
    return error instanceof Error && error.name === "MobileAuthError"
      ? mobileAuthErrorResponse(error)
      : accountDeletionErrorResponse(error);
  }
}
