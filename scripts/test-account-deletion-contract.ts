import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

async function main() {
  process.env.ACCOUNT_DELETION_CODE_PEPPER = "test-only-account-deletion-pepper";

  const {
  accountDeletionHash,
  accountDeletionStatusContractHeader,
  accountDeletionStatusContractVersion,
  createAccountDeletionReceipt,
  deletionCancellationSchema,
  deletionConfirmationSchema,
  deletionStatusSchema,
  } = await import("@/lib/mobile-account-deletion-contract");

  const receipt = createAccountDeletionReceipt();
  assert.match(receipt, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(accountDeletionHash(receipt), receipt);

  assert.equal(deletionStatusSchema.safeParse({ receipt }).success, true);
  assert.equal(deletionStatusSchema.safeParse({ receipt, identity: "leak" }).success, false);
  assert.equal(deletionStatusSchema.safeParse({ receipt: "not-a-receipt" }).success, false);
  assert.equal(deletionCancellationSchema.safeParse({}).success, true);
  assert.equal(deletionCancellationSchema.safeParse({ receipt }).success, false);
  assert.equal(accountDeletionStatusContractHeader, "X-ATS-Account-Deletion-Contract");
  assert.equal(accountDeletionStatusContractVersion, "account-deletion-v2");

  const validConfirmation = {
  confirmation: "DELETE_MY_ACCOUNT",
  acknowledgementVersion: "account-deletion-v1",
  verificationCode: "123456",
  idempotencyKey: "00000000-0000-4000-8000-000000000000",
  };
  assert.equal(deletionConfirmationSchema.safeParse(validConfirmation).success, true);
  assert.equal(deletionConfirmationSchema.safeParse({ ...validConfirmation, email: "not-accepted" }).success, false);
  assert.equal(deletionConfirmationSchema.safeParse({ ...validConfirmation, verificationCode: "12345" }).success, false);

  const releaseNote = readFileSync("docs/account-deletion-release.md", "utf8");
  assert.match(releaseNote, /first-release contract/);
  assert.match(releaseNote, /not\s+restored/);

  console.log("account-deletion contract runtime passed (receipt, cancellation, strict bodies, first-release gate)");
}

void main();
