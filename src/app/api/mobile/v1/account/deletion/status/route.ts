import {
  accountDeletionErrorResponse,
  accountDeletionStatusContractHeader,
  accountDeletionStatusContractVersion,
  deletionStatusSchema,
  AccountDeletionError,
} from "@/lib/mobile-account-deletion-contract";
import { getAccountDeletionStatusByReceipt } from "@/lib/account-deletion-service";
import { mobileAuthJsonResponse } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = deletionStatusSchema.parse(await request.json().catch(() => null));
    const contract = request.headers.get(accountDeletionStatusContractHeader);
    if (contract && contract !== accountDeletionStatusContractVersion) {
      throw new AccountDeletionError("ACCOUNT_DELETION_CONTRACT_UNSUPPORTED");
    }
    return mobileAuthJsonResponse(
      await getAccountDeletionStatusByReceipt(body.receipt, {
        includeSchedule: contract === accountDeletionStatusContractVersion,
      }),
      contract ? { headers: { [accountDeletionStatusContractHeader]: accountDeletionStatusContractVersion } } : undefined,
    );
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return accountDeletionErrorResponse(new AccountDeletionError("ACCOUNT_DELETION_INVALID_BODY"));
    }
    return accountDeletionErrorResponse(error);
  }
}
