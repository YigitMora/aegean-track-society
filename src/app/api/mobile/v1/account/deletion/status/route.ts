import {
  accountDeletionErrorResponse,
  accountDeletionStatusContractHeader,
  accountDeletionStatusContractVersion,
  legacyAccountDeletionStatusContractVersion,
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
    if (contract && contract !== legacyAccountDeletionStatusContractVersion && contract !== accountDeletionStatusContractVersion) {
      throw new AccountDeletionError("ACCOUNT_DELETION_CONTRACT_UNSUPPORTED");
    }
    const includeSchedule = contract === legacyAccountDeletionStatusContractVersion || contract === accountDeletionStatusContractVersion;
    return mobileAuthJsonResponse(
      await getAccountDeletionStatusByReceipt(body.receipt, {
        includeSchedule,
        contractVersion: contract === accountDeletionStatusContractVersion ? accountDeletionStatusContractVersion : legacyAccountDeletionStatusContractVersion,
      }),
      contract ? { headers: { [accountDeletionStatusContractHeader]: contract } } : undefined,
    );
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return accountDeletionErrorResponse(new AccountDeletionError("ACCOUNT_DELETION_INVALID_BODY"));
    }
    return accountDeletionErrorResponse(error);
  }
}
