import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import Module from "node:module";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";

const postgresBin = process.env.POSTGRES_BIN ?? "/opt/homebrew/opt/postgresql@16/bin";
const pg = (command: string) => join(postgresBin, command);
const port = 56621;
// PostgreSQL Unix sockets have a short path limit on macOS.
const testDirectory = mkdtempSync("/private/tmp/ats-account-deletion-postgres-");
const dataDirectory = join(testDirectory, "data");
const socketDirectory = join(testDirectory, "socket");
const database = "ats_account_deletion_disposable";
const upgradeDatabase = "ats_account_deletion_upgrade";
const databaseUser = execFileSync("id", ["-un"], { encoding: "utf8" }).trim();
const databaseUrl = `postgresql://${databaseUser}@127.0.0.1:${port}/${database}?schema=public`;

let primary: PrismaClient | undefined;
let authMode: "success" | "not-found" | "generic-not-found" | "failure" = "success";
let emailMode: "success" | "failure" | "concurrent" | "invalid" = "success";
let storageMode: "success" | "no-such-key" | "no-such-bucket" | "tenant-not-found" | "unknown-not-found" = "success";
let providerNow = new Date("2026-01-01T00:00:00.000Z");
let externalCalls = { auth: 0, email: 0, storage: 0 };
const logicalEffects = { auth: new Set<string>(), email: new Set<string>(), storage: new Set<string>() };
const transportEffectKeys = { auth: [] as string[], email: [] as string[], storage: [] as string[] };
const emailProviderDeliveries = new Map<string, { payload: string; acceptedAt: number; messageId: string }>();

function checkpoint(name: string) {
  console.log(`account-deletion-postgres ${name}: PASS`);
}

function command(commandPath: string, args: string[], environment: NodeJS.ProcessEnv = process.env, captureOutput = true) {
  return execFileSync(commandPath, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: environment,
    stdio: captureOutput ? ["ignore", "pipe", "pipe"] : "ignore",
    timeout: 60_000,
  });
}

function psql(sql: string, databaseName = database) {
  return command(pg("psql"), ["-h", "127.0.0.1", "-p", String(port), "-d", databaseName, "-Atqc", sql]).trim();
}

function testUserId() {
  return randomUUID();
}

async function createOperation(input: {
  stage?: "VERIFIED" | "DATABASE_PENDING" | "AUTH_PENDING" | "AUTH_DELETE_RETRY";
  storageCompleted?: boolean;
  databaseCompleted?: boolean;
  withImage?: boolean;
} = {}) {
  const id = `operation-${randomUUID()}`;
  const authUserId = testUserId();
  await primary!.user.create({ data: { id: authUserId, email: `${id}@invalid.local` } });
  const crypto = await import("@/lib/account-deletion-crypto");
  const contract = await import("@/lib/mobile-account-deletion-contract");
  await primary!.accountDeletionRequest.create({
    data: {
      id,
      authUserIdHash: contract.accountDeletionHash(authUserId),
      encryptedAuthUserId: crypto.encryptAccountDeletionValue(authUserId),
      encryptedEmail: crypto.encryptAccountDeletionValue(`${id}@invalid.local`),
      authProviderIdentity: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin.toLowerCase(),
      stage: input.stage ?? "VERIFIED",
      nextAttemptAt: new Date(0),
      storageCompletedAt: input.storageCompleted ? new Date(0) : null,
      databaseCompletedAt: input.databaseCompleted ? new Date(0) : null,
    },
  });
  if (input.withImage) {
    await primary!.vehicle.create({
      data: {
        userId: authUserId,
        brand: "Test",
        model: "Lease",
        plateNumber: `TEST-${id.slice(-8)}`,
        imagePath: `${authUserId}/test-image.jpg`,
      },
    });
  }
  return { id, authUserId };
}

async function isolateOperation(id: string) {
  await primary!.accountDeletionRequest.updateMany({
    where: { id: { not: id } },
    data: { legalHold: true },
  });
  await primary!.accountDeletionRequest.update({ where: { id }, data: { legalHold: false } });
}

async function verifyMigrationMetadata() {
  assert.equal(psql("SELECT count(*) FROM _prisma_migrations WHERE migration_name = '20260728170000_account_deletion_recovery' AND finished_at IS NOT NULL"), "1");
  assert.equal(psql("SELECT count(*) FROM information_schema.columns WHERE table_name = 'AccountDeletionRequest' AND column_name IN ('operationReceiptHash', 'encryptedAuthUserId', 'encryptedEmail', 'executionLeaseId', 'executionLeaseExpiresAt', 'operationVersion', 'nextAttemptAt', 'purgeAfter')"), "8");
  assert.equal(psql("SELECT count(*) FROM information_schema.columns WHERE table_name = 'AccountDeletionRequest' AND column_name IN ('storageReservationId', 'storageReservationExpiresAt', 'authReservationId', 'authReservationExpiresAt')"), "4");
  assert.equal(psql("SELECT count(*) FROM information_schema.columns WHERE table_name = 'AccountDeletionEmailOutbox' AND column_name IN ('deliveryReservationId', 'deliveryReservationExpiresAt')"), "2");
  assert.equal(psql("SELECT count(*) FROM information_schema.columns WHERE table_name = 'AccountDeletionRequest' AND column_name IN ('storageInvocationKey', 'storageInvocationState', 'storageInvocationStartedAt', 'storageInvocationTarget', 'authInvocationKey', 'authInvocationState', 'authInvocationStartedAt')"), "7");
  assert.equal(psql("SELECT count(*) FROM information_schema.columns WHERE table_name = 'AccountDeletionEmailOutbox' AND column_name IN ('deliveryInvocationKey', 'deliveryInvocationState', 'deliveryInvocationStartedAt')"), "3");
  assert.equal(psql("SELECT count(*) FROM information_schema.columns WHERE table_name = 'AccountDeletionRequest' AND column_name IN ('authProviderIdentity')"), "1");
  assert.equal(psql("SELECT count(*) FROM information_schema.columns WHERE table_name = 'AccountDeletionRequest' AND column_name IN ('scheduledDeletionAt', 'cancelledAt')"), "2");
  assert.equal(psql("SELECT count(*) FROM information_schema.columns WHERE table_name = 'AccountDeletionEmailOutbox' AND column_name IN ('deliveryPayloadCiphertext', 'deliveryPayloadFingerprint', 'deliveryFirstTransportAt', 'deliveryRetryDeadlineAt', 'providerMessageId', 'reconciliationRequiredAt')"), "6");
  assert.equal(psql("SELECT count(*) FROM pg_enum WHERE enumtypid = '\"AccountDeletionOutboxStatus\"'::regtype AND enumlabel = 'RECONCILIATION_REQUIRED'"), "1");
  assert.equal(psql("SELECT count(*) FROM pg_enum WHERE enumtypid = '\"AccountDeletionStage\"'::regtype AND enumlabel = 'CANCELLED'"), "1");
  assert.equal(psql("SELECT count(*) FROM pg_indexes WHERE tablename = 'AccountDeletionEmailOutbox' AND indexname = 'AccountDeletionEmailOutbox_accountDeletionRequestId_key'"), "1");
  assert.equal(psql("SELECT count(*) FROM pg_indexes WHERE tablename = 'AccountDeletionRequest' AND indexname = 'AccountDeletionRequest_operationReceiptHash_idx'"), "0");
  checkpoint("fresh-migration-metadata");
}

async function verifyUpgradeMigration() {
  const upgradePrismaDirectory = join(testDirectory, "upgrade-prisma");
  const upgradeUrl = `postgresql://${databaseUser}@127.0.0.1:${port}/${upgradeDatabase}?schema=public`;
  command(pg("createdb"), ["-h", "127.0.0.1", "-p", String(port), upgradeDatabase]);
  command("cp", ["-R", "prisma", upgradePrismaDirectory]);
  rmSync(join(upgradePrismaDirectory, "migrations", "20260728170000_account_deletion_recovery"), { recursive: true });
  rmSync(join(upgradePrismaDirectory, "migrations", "20260728200000_account_deletion_side_effect_reservations"), { recursive: true });
  rmSync(join(upgradePrismaDirectory, "migrations", "20260728210000_account_deletion_side_effect_invocations"), { recursive: true });
  rmSync(join(upgradePrismaDirectory, "migrations", "20260729200000_account_deletion_reconciliation_boundaries"), { recursive: true });
  rmSync(join(upgradePrismaDirectory, "migrations", "20260729150000_account_deletion_cancellation_schedule"), { recursive: true });
  command("./node_modules/.bin/prisma", ["migrate", "deploy", "--schema", join(upgradePrismaDirectory, "schema.prisma")], {
    ...process.env, DATABASE_URL: upgradeUrl, CI: "1", PRISMA_HIDE_UPDATE_MESSAGE: "1",
  });
  psql("INSERT INTO \"AccountDeletionRequest\" (id, \"authUserIdHash\", \"updatedAt\") VALUES ('upgrade-preserved', 'upgrade-hash', NOW())", upgradeDatabase);
  command("./node_modules/.bin/prisma", ["migrate", "deploy"], {
    ...process.env, DATABASE_URL: upgradeUrl, CI: "1", PRISMA_HIDE_UPDATE_MESSAGE: "1",
  });
  assert.equal(psql("SELECT \"operationVersion\" FROM \"AccountDeletionRequest\" WHERE id = 'upgrade-preserved'", upgradeDatabase), "0");
  assert.equal(psql("SELECT count(*) FROM _prisma_migrations WHERE migration_name = '20260728170000_account_deletion_recovery' AND finished_at IS NOT NULL", upgradeDatabase), "1");
  assert.equal(psql("SELECT count(*) FROM information_schema.columns WHERE table_name = 'AccountDeletionRequest' AND column_name IN ('scheduledDeletionAt', 'cancelledAt')", upgradeDatabase), "2");
  assert.equal(psql("SELECT count(*) FROM pg_enum WHERE enumtypid = '\"AccountDeletionStage\"'::regtype AND enumlabel = 'CANCELLED'", upgradeDatabase), "1");
  checkpoint("upgrade-migration-preserves-request");
}

async function verifyRollback() {
  const { id } = await createOperation();
  await assert.rejects(primary!.$transaction(async (tx) => {
    await tx.accountDeletionRequest.update({ where: { id }, data: { stage: "STORAGE_PENDING" } });
    throw new Error("intentional rollback");
  }));
  assert.equal((await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id } })).stage, "VERIFIED");
  checkpoint("transaction-rollback");
}

async function verifyLeaseExpiryAndStaleOwner() {
  const { processAccountDeletionClaimForTests, claimAccountDeletionOperationForTests } = await import("@/lib/account-deletion-service");
  const { id } = await createOperation({ withImage: true });
  await isolateOperation(id);
  let now = new Date("2026-01-01T00:00:00.000Z");
  const staleLease = randomUUID();
  await primary!.accountDeletionRequest.update({
    where: { id },
    data: {
      executionLeaseId: staleLease,
      executionLeaseExpiresAt: new Date(now.getTime() + 60_000),
      operationVersion: 7,
    },
  });
  const before = await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id } });
  const callsBefore = { ...externalCalls };
  now = new Date(now.getTime() + 60_001);
  await processAccountDeletionClaimForTests({
    requestId: id,
    leaseId: staleLease,
    operationVersion: before.operationVersion,
    clock: () => now,
  });
  const expiredState = await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id } });
  assert.equal(expiredState.stage, before.stage);
  assert.equal(expiredState.operationVersion, before.operationVersion);
  assert.equal(expiredState.executionLeaseId, staleLease);
  assert.deepEqual(externalCalls, callsBefore);

  const replacement = await claimAccountDeletionOperationForTests(() => now);
  assert.equal(replacement?.request.id, id);
  assert.notEqual(replacement?.lease.id, staleLease);
  const afterReplacement = await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id } });
  const replacementCalls = { ...externalCalls };
  await processAccountDeletionClaimForTests({
    requestId: id,
    leaseId: staleLease,
    operationVersion: before.operationVersion,
    clock: () => now,
  });
  assert.deepEqual(await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id } }), afterReplacement);
  assert.deepEqual(externalCalls, replacementCalls);
  checkpoint("lease-expiry-before-replacement-and-stale-owner");
}

async function verifyConcurrentClaims() {
  const { claimAccountDeletionOperationForTests } = await import("@/lib/account-deletion-service");
  for (let iteration = 0; iteration < 20; iteration += 1) {
    const { id } = await createOperation();
    await isolateOperation(id);
    const now = new Date("2026-01-01T00:00:00.000Z");
    const result = await Promise.all([
      claimAccountDeletionOperationForTests(() => now),
      claimAccountDeletionOperationForTests(() => now),
    ]);
    assert.equal(result.filter(Boolean).length, 1, `iteration ${iteration}`);
  }
  checkpoint("production-claim-cas-20x");
}

async function verifyInFlightLegalHolds() {
  const { runAccountDeletionWorker } = await import("@/lib/account-deletion-service");
  let now = new Date("2026-02-01T00:00:00.000Z");
  const clock = () => now;

  const scenarios: Array<{
    name: "storage" | "database" | "auth" | "completion";
    operation: Parameters<typeof createOperation>[0];
    hook: "beforeStorage" | "beforeDatabase" | "beforeAuth" | "beforeCompletion";
    expectedStage: "STORAGE_PENDING" | "DATABASE_PENDING" | "AUTH_PENDING";
    assertBlocked: (operation: { id: string; authUserId: string }, beforeCalls: typeof externalCalls) => Promise<void>;
  }> = [
    {
      name: "storage",
      operation: { withImage: true },
      hook: "beforeStorage",
      expectedStage: "STORAGE_PENDING",
      assertBlocked: async (_operation, beforeCalls) => {
        assert.equal(externalCalls.storage, beforeCalls.storage);
      },
    },
    {
      name: "database",
      operation: { stage: "DATABASE_PENDING", storageCompleted: true },
      hook: "beforeDatabase",
      expectedStage: "DATABASE_PENDING",
      assertBlocked: async (operation, beforeCalls) => {
        assert.equal(externalCalls.auth, beforeCalls.auth);
        assert.equal(await primary!.user.count({ where: { id: operation.authUserId } }), 1);
      },
    },
    {
      name: "auth",
      operation: { stage: "AUTH_PENDING", storageCompleted: true, databaseCompleted: true },
      hook: "beforeAuth",
      expectedStage: "AUTH_PENDING",
      assertBlocked: async (_operation, beforeCalls) => {
        assert.equal(externalCalls.auth, beforeCalls.auth);
      },
    },
    {
      name: "completion",
      operation: { stage: "AUTH_PENDING", storageCompleted: true, databaseCompleted: true },
      hook: "beforeCompletion",
      expectedStage: "AUTH_PENDING",
      assertBlocked: async (operation, beforeCalls) => {
        assert.equal(externalCalls.auth, beforeCalls.auth);
        assert.equal(await primary!.user.count({ where: { id: operation.authUserId } }), 1);
      },
    },
  ];

  for (const scenario of scenarios) {
    const operation = await createOperation(scenario.operation);
    await isolateOperation(operation.id);
    const beforeCalls = { ...externalCalls };
    await runAccountDeletionWorker({
      limit: 1,
      clock,
      hooks: {
        [scenario.hook]: async () => {
          await primary!.accountDeletionRequest.update({
            where: { id: operation.id },
            data: { legalHold: true, legalHoldReason: "disposable-test-hold" },
          });
        },
      },
    });
    const blocked = await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id: operation.id } });
    assert.equal(blocked.legalHold, true, scenario.name);
    assert.equal(blocked.stage, scenario.expectedStage, scenario.name);
    await scenario.assertBlocked(operation, beforeCalls);

    await primary!.accountDeletionRequest.update({
      where: { id: operation.id },
      data: { legalHold: false, legalHoldReason: null, executionLeaseExpiresAt: new Date(0), nextAttemptAt: new Date(0) },
    });
    now = new Date(now.getTime() + 60_001);
    await runAccountDeletionWorker({ limit: 1, clock });
    assert.equal((await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id: operation.id } })).stage, "COMPLETED", scenario.name);
  }

  const completionEmail = await createOperation();
  await isolateOperation(completionEmail.id);
  const crypto = await import("@/lib/account-deletion-crypto");
  await primary!.accountDeletionRequest.update({
    where: { id: completionEmail.id },
    data: { stage: "COMPLETED", completedAt: now, databaseCompletedAt: now },
  });
  const completionOutbox = await primary!.accountDeletionEmailOutbox.create({
    data: {
      id: `completion-outbox-${randomUUID()}`,
      accountDeletionRequestId: completionEmail.id,
      recipientCiphertext: crypto.encryptAccountDeletionValue("completion-email@invalid.local"),
    },
  });
  const emailBeforeCompletionHold = externalCalls.email;
  await runAccountDeletionWorker({
    limit: 1,
    clock,
    hooks: {
      beforeCompletionEmail: async () => {
        await primary!.accountDeletionRequest.update({
          where: { id: completionEmail.id },
          data: { legalHold: true, legalHoldReason: "disposable-completion-email-hold" },
        });
      },
    },
  });
  assert.equal(externalCalls.email, emailBeforeCompletionHold);
  assert.equal((await primary!.accountDeletionEmailOutbox.findUniqueOrThrow({ where: { id: completionOutbox.id } })).status, "PENDING");
  await primary!.$transaction(async (tx) => {
    await tx.accountDeletionRequest.update({ where: { id: completionEmail.id }, data: { legalHold: false, legalHoldReason: null } });
    await tx.accountDeletionEmailOutbox.update({ where: { id: completionOutbox.id }, data: { executionLeaseExpiresAt: new Date(0) } });
  });
  now = new Date(now.getTime() + 60_001);
  await runAccountDeletionWorker({ limit: 1, clock });
  assert.equal(externalCalls.email, emailBeforeCompletionHold + 1);
  assert.equal((await primary!.accountDeletionEmailOutbox.findUniqueOrThrow({ where: { id: completionOutbox.id } })).status, "SENT");

  const completed = await createOperation();
  await isolateOperation(completed.id);
  await primary!.accountDeletionRequest.update({
    where: { id: completed.id },
    data: { stage: "COMPLETED", legalHold: true, completedAt: new Date(0), purgeAfter: new Date(0) },
  });
  await primary!.accountDeletionEmailOutbox.create({
    data: { id: `held-outbox-${randomUUID()}`, accountDeletionRequestId: completed.id, recipientCiphertext: "held-test-ciphertext" },
  });
  const emailBeforeHeldOutbox = externalCalls.email;
  await runAccountDeletionWorker({ limit: 1, clock });
  assert.equal(await primary!.accountDeletionRequest.count({ where: { id: completed.id } }), 1);
  assert.equal(externalCalls.email, emailBeforeHeldOutbox);
  await primary!.$transaction(async (tx) => {
    await tx.accountDeletionEmailOutbox.updateMany({
      where: { accountDeletionRequestId: completed.id },
      data: { recipientCiphertext: null, status: "SENT", sentAt: new Date() },
    });
    await tx.accountDeletionRequest.update({ where: { id: completed.id }, data: { legalHold: false } });
  });
  await runAccountDeletionWorker({ limit: 1, clock });
  assert.equal(await primary!.accountDeletionRequest.count({ where: { id: completed.id } }), 0);
  checkpoint("in-flight-legal-hold-and-purge-guard");
}

async function verifyDurableReservationOrdering() {
  const service = await import("@/lib/account-deletion-service");
  const holdClient = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  await holdClient.$connect();
  let now = new Date("2026-02-02T00:00:00.000Z");
  const clock = () => now;
  const cases: Array<{
    name: "storage" | "auth" | "completion_email";
    operation: Parameters<typeof createOperation>[0];
    hook: "afterStorageReservationBeforeAdapter" | "afterAuthReservationBeforeAdapter" | "afterCompletionEmailReservationBeforeAdapter";
    callKey: keyof typeof externalCalls;
    holdWinsStatus: "APPLIED" | "COMMIT_POINT_PASSED";
    prepare?: (operation: { id: string }) => Promise<void>;
  }> = [
    { name: "storage", operation: { withImage: true }, hook: "afterStorageReservationBeforeAdapter", callKey: "storage", holdWinsStatus: "APPLIED" },
    { name: "auth", operation: { stage: "AUTH_PENDING", storageCompleted: true, databaseCompleted: true }, hook: "afterAuthReservationBeforeAdapter", callKey: "auth", holdWinsStatus: "COMMIT_POINT_PASSED" },
    {
      name: "completion_email", operation: {}, hook: "afterCompletionEmailReservationBeforeAdapter", callKey: "email",
      holdWinsStatus: "COMMIT_POINT_PASSED",
      prepare: async (operation) => {
        const crypto = await import("@/lib/account-deletion-crypto");
        await primary!.accountDeletionRequest.update({ where: { id: operation.id }, data: { stage: "COMPLETED", completedAt: now, databaseCompletedAt: now } });
        await primary!.accountDeletionEmailOutbox.create({ data: { id: `reservation-email-${randomUUID()}`, accountDeletionRequestId: operation.id, recipientCiphertext: crypto.encryptAccountDeletionValue("reservation-email@invalid.local") } });
      },
    },
  ];

  try {
    for (const scenario of cases) {
      for (let iteration = 0; iteration < 20; iteration += 1) {
      const operation = await createOperation(scenario.operation);
      await isolateOperation(operation.id);
      await scenario.prepare?.(operation);
      let arrive: () => void = () => undefined;
      const reserved = new Promise<void>((resolve) => { arrive = resolve; });
      let release: () => void = () => undefined;
      const barrier = new Promise<void>((resolve) => { release = resolve; });
      const before = externalCalls[scenario.callKey];
      const worker = service.runAccountDeletionWorker({
        limit: 1,
        clock,
        hooks: { [scenario.hook]: async () => { arrive(); await barrier; } },
      });
      await reserved;
      const concurrentWorker = service.runAccountDeletionWorker({ limit: 1, clock });
      const hold = await service.setAccountDeletionLegalHold({ requestId: operation.id, active: true, reason: "reservation-ordering-test", now }, holdClient);
      assert.equal(hold.status, "COMMIT_POINT_PASSED", `${scenario.name} reservation wins ${iteration}`);
      release();
      await Promise.all([worker, concurrentWorker]);
      assert.equal(externalCalls[scenario.callKey], before + 1, `${scenario.name} adapter exactly once ${iteration}`);
    }
    }

    for (const scenario of cases) {
      for (let iteration = 0; iteration < 20; iteration += 1) {
      const operation = await createOperation(scenario.operation);
      await isolateOperation(operation.id);
      await scenario.prepare?.(operation);
      const before = externalCalls[scenario.callKey];
      assert.equal((await service.setAccountDeletionLegalHold({ requestId: operation.id, active: true, reason: "hold-wins-test", now }, holdClient)).status, scenario.holdWinsStatus);
      await service.runAccountDeletionWorker({ limit: 1, clock });
      assert.equal(externalCalls[scenario.callKey], before, `${scenario.name} hold wins ${iteration}`);
      assert.equal((await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id: operation.id } })).legalHold, true);
      assert.equal((await service.setAccountDeletionLegalHold({ requestId: operation.id, active: false, now }, holdClient)).status, "CLEARED");
      await primary!.accountDeletionRequest.update({ where: { id: operation.id }, data: { executionLeaseExpiresAt: new Date(0), nextAttemptAt: new Date(0) } });
      now = new Date(now.getTime() + 60_001);
      await service.runAccountDeletionWorker({ limit: 1, clock });
    }
    }
  } finally {
    await holdClient.$disconnect();
  }
  checkpoint("durable-side-effect-reservation-ordering-20x");
}

async function verifyInvocationTakeoverIdempotency() {
  const service = await import("@/lib/account-deletion-service");
  const observer = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  await observer.$connect();
  let now = new Date("2026-02-04T00:00:00.000Z");
  const clock = () => now;
  const cases: Array<{
    name: "storage" | "auth" | "completion_email";
    operation: Parameters<typeof createOperation>[0];
    hook: "afterStorageInvocationBeforeAdapter" | "afterAuthInvocationBeforeAdapter" | "afterCompletionEmailInvocationBeforeAdapter";
    callKey: keyof typeof externalCalls;
    prepare?: (operation: { id: string }) => Promise<void>;
    assertState: (operation: { id: string }) => Promise<void>;
  }> = [
    {
      name: "storage",
      operation: { withImage: true },
      hook: "afterStorageInvocationBeforeAdapter",
      callKey: "storage",
      assertState: async (operation) => {
        const request = await observer.accountDeletionRequest.findUniqueOrThrow({ where: { id: operation.id } });
        assert.equal(request.storageInvocationState, "SUCCEEDED");
        assert.match(request.storageInvocationKey ?? "", /^account-deletion\//);
      },
    },
    {
      name: "auth",
      operation: { stage: "AUTH_PENDING", storageCompleted: true, databaseCompleted: true },
      hook: "afterAuthInvocationBeforeAdapter",
      callKey: "auth",
      assertState: async (operation) => {
        const request = await observer.accountDeletionRequest.findUniqueOrThrow({ where: { id: operation.id } });
        assert.equal(request.authInvocationState, "SUCCEEDED");
        assert.match(request.authInvocationKey ?? "", /^account-deletion\//);
      },
    },
    {
      name: "completion_email",
      operation: {},
      hook: "afterCompletionEmailInvocationBeforeAdapter",
      callKey: "email",
      prepare: async (operation) => {
        const crypto = await import("@/lib/account-deletion-crypto");
        await primary!.accountDeletionRequest.update({ where: { id: operation.id }, data: { stage: "COMPLETED", completedAt: now, databaseCompletedAt: now } });
        await primary!.accountDeletionEmailOutbox.create({ data: { id: `takeover-email-${randomUUID()}`, accountDeletionRequestId: operation.id, recipientCiphertext: crypto.encryptAccountDeletionValue("takeover-email@invalid.local") } });
      },
      assertState: async (operation) => {
        const outbox = await observer.accountDeletionEmailOutbox.findUniqueOrThrow({ where: { accountDeletionRequestId: operation.id } });
        assert.equal(outbox.status, "SENT");
        assert.equal(outbox.deliveryInvocationState, "SUCCEEDED");
        assert.match(outbox.deliveryInvocationKey ?? "", /^account-deletion\//);
      },
    },
  ];

  try {
    for (const scenario of cases) {
      for (let iteration = 0; iteration < 20; iteration += 1) {
        const operation = await createOperation(scenario.operation);
        await isolateOperation(operation.id);
        await scenario.prepare?.(operation);
        let arrived: () => void = () => undefined;
        const invoked = new Promise<void>((resolve) => { arrived = resolve; });
        let release: () => void = () => undefined;
        const barrier = new Promise<void>((resolve) => { release = resolve; });
        const beforeTransport = externalCalls[scenario.callKey];
        const beforeLogical = logicalEffects[scenario.callKey].size;
        const beforeTransportKeys = transportEffectKeys[scenario.callKey].length;
        const workerA = service.runAccountDeletionWorker({
          limit: 1,
          clock,
          hooks: { [scenario.hook]: async () => { arrived(); await barrier; } },
        });
        await invoked;
        now = new Date(now.getTime() + 60_001);
        await service.runAccountDeletionWorker({ limit: 1, clock });
        release();
        await workerA;
        assert.equal(externalCalls[scenario.callKey], beforeTransport + 2, `${scenario.name} transport attempts ${iteration}`);
        assert.equal(logicalEffects[scenario.callKey].size, beforeLogical + 1, `${scenario.name} logical effect ${iteration}`);
        assert.equal(new Set(transportEffectKeys[scenario.callKey].slice(beforeTransportKeys)).size, 1, `${scenario.name} stable effect identity ${iteration}`);
        await scenario.assertState(operation);
      }
    }
  } finally {
    await observer.$disconnect();
  }
  checkpoint("invoking-takeover-provider-idempotency-20x");
}

async function verifyDurableFuturePhaseHold() {
  const service = await import("@/lib/account-deletion-service");
  const holdClient = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  await holdClient.$connect();
  let now = new Date("2026-02-05T00:00:00.000Z");
  const clock = () => now;
  const cases: Array<{
    name: "storage" | "auth";
    operation: Parameters<typeof createOperation>[0];
    hook: "afterStorageReservationBeforeAdapter" | "afterAuthReservationBeforeAdapter";
    expectedCurrentEffect: keyof typeof externalCalls;
    assertFutureBlocked: (before: typeof externalCalls) => void;
  }> = [
    {
      name: "storage",
      operation: { withImage: true },
      hook: "afterStorageReservationBeforeAdapter",
      expectedCurrentEffect: "storage",
      assertFutureBlocked: (before) => {
        assert.equal(externalCalls.auth, before.auth);
        assert.equal(externalCalls.email, before.email);
      },
    },
    {
      name: "auth",
      operation: { stage: "AUTH_PENDING", storageCompleted: true, databaseCompleted: true },
      hook: "afterAuthReservationBeforeAdapter",
      expectedCurrentEffect: "auth",
      assertFutureBlocked: (before) => assert.equal(externalCalls.email, before.email),
    },
  ];

  try {
    for (const scenario of cases) {
      for (let iteration = 0; iteration < 20; iteration += 1) {
        const operation = await createOperation(scenario.operation);
        await isolateOperation(operation.id);
        let arrived: () => void = () => undefined;
        const reserved = new Promise<void>((resolve) => { arrived = resolve; });
        let release: () => void = () => undefined;
        const barrier = new Promise<void>((resolve) => { release = resolve; });
        const before = { ...externalCalls };
        const worker = service.runAccountDeletionWorker({
          limit: 1,
          clock,
          hooks: { [scenario.hook]: async () => { arrived(); await barrier; } },
        });
        await reserved;
        const hold = await service.setAccountDeletionLegalHold({ requestId: operation.id, active: true, reason: "durable-future-phase-hold", now }, holdClient);
        assert.equal(hold.status, "COMMIT_POINT_PASSED", `${scenario.name} hold persisted ${iteration}`);
        assert.equal((await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id: operation.id } })).legalHold, true);
        release();
        await worker;
        assert.equal(externalCalls[scenario.expectedCurrentEffect], before[scenario.expectedCurrentEffect] + 1, `${scenario.name} committed effect completes ${iteration}`);
        scenario.assertFutureBlocked(before);
        const held = await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id: operation.id } });
        assert.equal(held.legalHold, true);
        assert.equal(held.executionLeaseId, null, `${scenario.name} current phase releases lease while held ${iteration}`);
        assert.equal((await service.setAccountDeletionLegalHold({ requestId: operation.id, active: false, now }, holdClient)).status, "CLEARED");
        now = new Date(now.getTime() + 60_001);
        await service.runAccountDeletionWorker({ limit: 1, clock });
        assert.equal((await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id: operation.id } })).stage, "COMPLETED");
      }
    }
  } finally {
    await holdClient.$disconnect();
  }
  checkpoint("durable-future-phase-hold-20x");
}

async function verifyExpiredReservationRecovery() {
  const { runAccountDeletionWorker } = await import("@/lib/account-deletion-service");
  const now = new Date("2026-02-03T00:00:00.000Z");
  const clock = () => now;

  const storage = await createOperation({ withImage: true });
  await isolateOperation(storage.id);
  const storageBefore = externalCalls.storage;
  await primary!.accountDeletionRequest.update({
    where: { id: storage.id },
    data: { storageReservationId: randomUUID(), storageReservationExpiresAt: new Date(0) },
  });
  await runAccountDeletionWorker({ limit: 1, clock });
  assert.equal(externalCalls.storage, storageBefore + 1);
  assert.equal((await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id: storage.id } })).stage, "COMPLETED");

  const auth = await createOperation({ stage: "AUTH_PENDING", storageCompleted: true, databaseCompleted: true });
  await isolateOperation(auth.id);
  const authBefore = externalCalls.auth;
  await primary!.accountDeletionRequest.update({
    where: { id: auth.id },
    data: { authReservationId: randomUUID(), authReservationExpiresAt: new Date(0) },
  });
  await runAccountDeletionWorker({ limit: 1, clock });
  assert.equal(externalCalls.auth, authBefore + 1);
  assert.equal((await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id: auth.id } })).stage, "COMPLETED");

  const email = await createOperation();
  await isolateOperation(email.id);
  const crypto = await import("@/lib/account-deletion-crypto");
  await primary!.accountDeletionRequest.update({ where: { id: email.id }, data: { stage: "COMPLETED", completedAt: now, databaseCompletedAt: now } });
  await primary!.accountDeletionEmailOutbox.create({
    data: {
      id: `expired-reservation-email-${randomUUID()}`,
      accountDeletionRequestId: email.id,
      recipientCiphertext: crypto.encryptAccountDeletionValue("expired-reservation@invalid.local"),
      deliveryReservationId: randomUUID(),
      deliveryReservationExpiresAt: new Date(0),
    },
  });
  const emailBefore = externalCalls.email;
  await runAccountDeletionWorker({ limit: 1, clock });
  assert.equal(externalCalls.email, emailBefore + 1);
  assert.equal((await primary!.accountDeletionEmailOutbox.findUniqueOrThrow({ where: { accountDeletionRequestId: email.id } })).status, "SENT");
  checkpoint("expired-side-effect-reservation-recovery");
}

async function verifyCancellationAndScheduledDeletion() {
  const contract = await import("@/lib/mobile-account-deletion-contract");
  const {
    accountDeletionGracePeriodMs,
    cancelAccountDeletion,
    claimAccountDeletionOperationForTests,
    confirmAccountDeletion,
    getAccountDeletionStatusByReceipt,
    runAccountDeletionWorker,
  } = await import("@/lib/account-deletion-service");
  let now = new Date("2026-04-01T00:00:00.000Z");
  const clock = () => now;
  const pending = await createOperation();
  await isolateOperation(pending.id);
  const receipt = contract.createAccountDeletionReceipt();
  const code = "123456";
  await primary!.accountDeletionRequest.update({
    where: { id: pending.id },
    data: {
      stage: "VERIFICATION_PENDING",
      idempotencyKeyHash: null,
      verificationHash: contract.accountDeletionHash(`${pending.authUserId}:${code}`),
      verificationExpiresAt: new Date(now.getTime() + 60_000),
      operationReceiptHash: contract.accountDeletionHash(receipt),
      scheduledDeletionAt: null,
      nextAttemptAt: null,
      executionLeaseId: null,
      executionLeaseExpiresAt: null,
      legalHold: false,
    },
  });

  const confirmed = await confirmAccountDeletion({
    authUserId: pending.authUserId,
    verificationCode: code,
    idempotencyKey: "00000000-0000-4000-8000-000000000001",
    clock,
  });
  assert.deepEqual(confirmed, { data: { status: "pending" } });
  const expectedSchedule = new Date(now.getTime() + accountDeletionGracePeriodMs);
  const scheduled = await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id: pending.id } });
  assert.equal(scheduled.scheduledDeletionAt?.toISOString(), expectedSchedule.toISOString());
  assert.equal(scheduled.nextAttemptAt?.toISOString(), expectedSchedule.toISOString());
  assert.deepEqual(await getAccountDeletionStatusByReceipt(receipt), { data: { status: "pending" } });
  assert.deepEqual(
    await getAccountDeletionStatusByReceipt(receipt, { includeSchedule: true }),
    { data: { status: "pending", scheduledDeletionAt: expectedSchedule.toISOString() } },
  );

  const beforeSchedule = { ...externalCalls };
  await runAccountDeletionWorker({ limit: 1, clock });
  assert.deepEqual(externalCalls, beforeSchedule);

  const cancellationResults = await Promise.all([
    cancelAccountDeletion({ authUserId: pending.authUserId, clock }),
    cancelAccountDeletion({ authUserId: pending.authUserId, clock }),
  ]);
  assert.deepEqual(cancellationResults, [
    { data: { status: "cancelled" } },
    { data: { status: "cancelled" } },
  ]);
  const cancelled = await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id: pending.id } });
  assert.equal(cancelled.stage, "CANCELLED");
  assert.equal(cancelled.scheduledDeletionAt, null);
  assert.equal(cancelled.nextAttemptAt, null);
  assert.equal(cancelled.encryptedAuthUserId, null);
  assert.equal(cancelled.encryptedEmail, null);
  assert.notEqual(cancelled.cancelledAt, null);
  assert.deepEqual(
    await getAccountDeletionStatusByReceipt(receipt, { includeSchedule: true }),
    { data: { status: "cancelled", scheduledDeletionAt: null } },
  );

  now = new Date(expectedSchedule.getTime() + 1);
  const beforeCancelledWorker = { ...externalCalls };
  await runAccountDeletionWorker({ limit: 1, clock });
  assert.deepEqual(externalCalls, beforeCancelledWorker);

  await assert.rejects(
    cancelAccountDeletion({ authUserId: testUserId(), clock }),
    (error: unknown) => error instanceof contract.AccountDeletionError && error.code === "ACCOUNT_DELETION_NOT_CANCELLABLE",
  );

  const expired = await createOperation();
  await isolateOperation(expired.id);
  await primary!.accountDeletionRequest.update({
    where: { id: expired.id },
    data: { scheduledDeletionAt: now, nextAttemptAt: now, executionLeaseId: null, executionLeaseExpiresAt: null },
  });
  await assert.rejects(
    cancelAccountDeletion({ authUserId: expired.authUserId, clock }),
    (error: unknown) => error instanceof contract.AccountDeletionError && error.code === "ACCOUNT_DELETION_NOT_CANCELLABLE",
  );

  const processing = await createOperation();
  await isolateOperation(processing.id);
  await primary!.accountDeletionRequest.update({
    where: { id: processing.id },
    data: { scheduledDeletionAt: now, nextAttemptAt: now },
  });
  const claim = await claimAccountDeletionOperationForTests(clock);
  assert.equal(claim?.request.id, processing.id);
  await assert.rejects(
    cancelAccountDeletion({ authUserId: processing.authUserId, clock }),
    (error: unknown) => error instanceof contract.AccountDeletionError && error.code === "ACCOUNT_DELETION_NOT_CANCELLABLE",
  );

  const completed = await createOperation();
  await isolateOperation(completed.id);
  await primary!.accountDeletionRequest.update({ where: { id: completed.id }, data: { stage: "COMPLETED", completedAt: now } });
  await assert.rejects(
    cancelAccountDeletion({ authUserId: completed.authUserId, clock }),
    (error: unknown) => error instanceof contract.AccountDeletionError && error.code === "ACCOUNT_DELETION_NOT_CANCELLABLE",
  );
  checkpoint("cancellation-schedule-owner-race-and-worker-skip");
}

async function verifyReceiptStatusRateLimiter() {
  const service = await import("@/lib/account-deletion-service");
  service.resetAccountDeletionRateLimitForTests();
  const start = Date.parse("2026-03-01T00:00:00.000Z");
  // The public endpoint receives only hashes; the bounded limiter must retain
  // neither raw receipts nor attacker-controlled unbounded cardinality.
  let saturated = 0;
  for (let index = 0; index < 1_500; index += 1) {
    try {
      const receipt = `${"a".repeat(37)}${index.toString(36).padStart(6, "0")}`;
      service.recordAccountDeletionRateLimitForTests(receipt, start);
    } catch (error) {
      assert.equal((error as { code?: string }).code, "ACCOUNT_DELETION_STATUS_LIMITED");
      saturated += 1;
    }
  }
  assert.equal(service.accountDeletionRateLimitEntryCountForTests(), 1_000);
  assert.equal(saturated, 500);
  for (let index = 0; index < 63; index += 1) {
    service.recordAccountDeletionRateLimitForTests(`fresh-${index}`, start + 60_001);
    assert.ok(service.accountDeletionRateLimitStatsForTests().lastCleanupWork <= 16);
  }
  assert.ok(service.accountDeletionRateLimitEntryCountForTests() <= 64);
  service.resetAccountDeletionRateLimitForTests();
  checkpoint("receipt-status-rate-limit-bounded-memory");
}

async function verifyOutboxUniqueness() {
  const { id } = await createOperation();
  const contenders = [
    new PrismaClient({ datasources: { db: { url: databaseUrl } } }),
    new PrismaClient({ datasources: { db: { url: databaseUrl } } }),
  ];
  let arrived = 0;
  let release: () => void = () => undefined;
  const barrier = new Promise<void>((resolve) => { release = resolve; });
  const create = async (client: PrismaClient) => {
    arrived += 1;
    if (arrived === contenders.length) release();
    await barrier;
    return client.accountDeletionEmailOutbox.create({ data: { id: `outbox-${randomUUID()}`, accountDeletionRequestId: id } });
  };
  const result = await Promise.allSettled(contenders.map(create));
  await Promise.all(contenders.map((client) => client.$disconnect()));
  assert.equal(result.filter((entry) => entry.status === "fulfilled").length, 1);
  assert.equal(result.filter((entry) => entry.status === "rejected").length, 1);
  assert.equal(await primary!.accountDeletionEmailOutbox.count({ where: { accountDeletionRequestId: id } }), 1);
  checkpoint("completion-outbox-unique");
}

async function verifyServiceRecovery() {
  const { AccountDeletionError, accountDeletionHash } = await import("@/lib/mobile-account-deletion-contract");
  const { confirmAccountDeletion, runAccountDeletionWorker } = await import("@/lib/account-deletion-service");
  await primary!.accountDeletionRequest.updateMany({
    where: { stage: "VERIFIED" },
    data: { legalHold: true },
  });
  await primary!.accountDeletionEmailOutbox.updateMany({
    where: { status: "PENDING", recipientCiphertext: null },
    data: { status: "SENT", sentAt: new Date() },
  });

  const idempotency = await createOperation();
  await primary!.accountDeletionRequest.update({
    where: { id: idempotency.id },
    data: { idempotencyKeyHash: accountDeletionHash("first-key"), legalHold: true },
  });
  await assert.rejects(
    confirmAccountDeletion({ authUserId: idempotency.authUserId, verificationCode: "123456", idempotencyKey: "00000000-0000-4000-8000-000000000000" }),
    (error: unknown) => error instanceof AccountDeletionError && error.code === "ACCOUNT_DELETION_IN_PROGRESS",
  );
  assert.equal((await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id: idempotency.id } })).idempotencyKeyHash, accountDeletionHash("first-key"));

  authMode = "success";
  emailMode = "success";
  const happy = await createOperation();
  await runAccountDeletionWorker({ limit: 1 });
  const happyState = await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id: happy.id }, include: { emailOutbox: true } });
  assert.equal(happyState.stage, "COMPLETED");
  assert.equal(happyState.encryptedAuthUserId, null);
  assert.equal(happyState.emailOutbox[0]?.status, "SENT");
  assert.equal(happyState.encryptedEmail, null);
  assert.equal(await primary!.user.count({ where: { id: happy.authUserId } }), 0);

  authMode = "failure";
  const retry = await createOperation();
  await runAccountDeletionWorker({ limit: 1 });
  let retryState = await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id: retry.id } });
  assert.equal(retryState.stage, "AUTH_DELETE_RETRY");
  await primary!.accountDeletionRequest.update({ where: { id: retry.id }, data: { executionLeaseExpiresAt: new Date(0), nextAttemptAt: new Date(0) } });
  authMode = "not-found";
  await runAccountDeletionWorker({ limit: 1 });
  retryState = await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id: retry.id } });
  assert.equal(retryState.stage, "COMPLETED");

  authMode = "success";
  emailMode = "failure";
  const mailFailure = await createOperation();
  await runAccountDeletionWorker({ limit: 1 });
  const mailState = await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id: mailFailure.id }, include: { emailOutbox: true } });
  assert.equal(mailState.stage, "COMPLETED");
  assert.equal(mailState.emailOutbox[0]?.status, "RETRYABLE");

  const crypto = await import("@/lib/account-deletion-crypto");
  const absentAuthUserId = testUserId();
  const noDatabaseUser = await primary!.accountDeletionRequest.create({
    data: {
      id: `db-failure-${randomUUID()}`,
      authUserIdHash: `hash-${randomUUID()}`,
      encryptedAuthUserId: crypto.encryptAccountDeletionValue(absentAuthUserId),
      authProviderIdentity: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin.toLowerCase(),
      stage: "VERIFIED",
      nextAttemptAt: new Date(0),
    },
  });
  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    await runAccountDeletionWorker({ limit: 1 });
  } finally {
    console.error = originalConsoleError;
  }
  const failedAfterStorage = await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id: noDatabaseUser.id } });
  assert.equal(failedAfterStorage.stage, "FAILED_RETRYABLE");
  assert.equal(failedAfterStorage.safeErrorCode, "DATABASE_DELETE_FAILED");
  assert.notEqual(failedAfterStorage.storageCompletedAt, null);
  await primary!.user.create({ data: { id: absentAuthUserId, email: `recovered-${randomUUID()}@invalid.local` } });
  await primary!.accountDeletionRequest.update({
    where: { id: noDatabaseUser.id },
    data: { executionLeaseExpiresAt: new Date(0), nextAttemptAt: new Date(0) },
  });
  emailMode = "success";
  await runAccountDeletionWorker({ limit: 1 });
  assert.equal((await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id: noDatabaseUser.id } })).stage, "COMPLETED");
  assert.ok(externalCalls.auth >= 2);
  assert.ok(externalCalls.email >= 2);
  checkpoint("storage-auth-email-recovery");
}

async function verifyProviderReconciliationBoundaries() {
  const { runAccountDeletionWorker } = await import("@/lib/account-deletion-service");
  let now = new Date("2026-03-01T00:00:00.000Z");
  const clock = () => now;
  authMode = "success";
  emailMode = "success";
  storageMode = "success";

  const retryInsideWindow = await createOperation();
  await isolateOperation(retryInsideWindow.id);
  providerNow = now;
  const emailBefore = externalCalls.email;
  const logicalBefore = logicalEffects.email.size;
  let crashAfterAcceptance = true;
  await runAccountDeletionWorker({
    limit: 1,
    clock,
    hooks: {
      afterCompletionEmailAdapterBeforeSuccessCommit: () => {
        if (!crashAfterAcceptance) return;
        crashAfterAcceptance = false;
        throw new Error("simulated process loss after provider acceptance");
      },
    },
  });
  let retryOutbox = await primary!.accountDeletionEmailOutbox.findUniqueOrThrow({ where: { accountDeletionRequestId: retryInsideWindow.id } });
  assert.equal(retryOutbox.status, "RETRYABLE");
  assert.ok(retryOutbox.deliveryPayloadCiphertext);
  assert.ok(retryOutbox.deliveryPayloadFingerprint);
  assert.ok(retryOutbox.deliveryFirstTransportAt);
  assert.ok(retryOutbox.deliveryRetryDeadlineAt);
  const retryKey = retryOutbox.deliveryInvocationKey;

  now = new Date(now.getTime() + 60_001);
  providerNow = now;
  await runAccountDeletionWorker({ limit: 1, clock });
  retryOutbox = await primary!.accountDeletionEmailOutbox.findUniqueOrThrow({ where: { accountDeletionRequestId: retryInsideWindow.id } });
  assert.equal(retryOutbox.status, "SENT");
  assert.ok(retryOutbox.providerMessageId);
  assert.equal(externalCalls.email, emailBefore + 2);
  assert.equal(logicalEffects.email.size, logicalBefore + 1);
  assert.equal(retryOutbox.deliveryInvocationKey, retryKey);

  const expiredWindow = await createOperation();
  await isolateOperation(expiredWindow.id);
  now = new Date("2026-03-03T00:00:00.000Z");
  providerNow = now;
  crashAfterAcceptance = true;
  await runAccountDeletionWorker({
    limit: 1,
    clock,
    hooks: {
      afterCompletionEmailAdapterBeforeSuccessCommit: () => {
        if (!crashAfterAcceptance) return;
        crashAfterAcceptance = false;
        throw new Error("simulated process loss after provider acceptance");
      },
    },
  });
  const attemptsBeforeDeadline = externalCalls.email;
  now = new Date(now.getTime() + 23 * 60 * 60 * 1000 + 1);
  providerNow = now;
  await runAccountDeletionWorker({ limit: 1, clock });
  const expiredOutbox = await primary!.accountDeletionEmailOutbox.findUniqueOrThrow({ where: { accountDeletionRequestId: expiredWindow.id } });
  assert.equal(expiredOutbox.status, "RECONCILIATION_REQUIRED");
  assert.equal(expiredOutbox.safeErrorCode, "COMPLETION_EMAIL_RECONCILIATION_REQUIRED");
  assert.equal(externalCalls.email, attemptsBeforeDeadline);

  const concurrent = await createOperation();
  await isolateOperation(concurrent.id);
  emailMode = "concurrent";
  now = new Date("2026-03-05T00:00:00.000Z");
  providerNow = now;
  await runAccountDeletionWorker({ limit: 1, clock });
  let concurrentOutbox = await primary!.accountDeletionEmailOutbox.findUniqueOrThrow({ where: { accountDeletionRequestId: concurrent.id } });
  assert.equal(concurrentOutbox.status, "RETRYABLE");
  assert.equal(concurrentOutbox.safeErrorCode, "COMPLETION_EMAIL_CONCURRENT");
  const concurrentKey = concurrentOutbox.deliveryInvocationKey;
  emailMode = "success";
  now = new Date(now.getTime() + 60_001);
  providerNow = now;
  await runAccountDeletionWorker({ limit: 1, clock });
  concurrentOutbox = await primary!.accountDeletionEmailOutbox.findUniqueOrThrow({ where: { accountDeletionRequestId: concurrent.id } });
  assert.equal(concurrentOutbox.status, "SENT");
  assert.equal(concurrentOutbox.deliveryInvocationKey, concurrentKey);

  const invalid = await createOperation();
  await isolateOperation(invalid.id);
  emailMode = "invalid";
  now = new Date("2026-03-06T00:00:00.000Z");
  providerNow = now;
  await runAccountDeletionWorker({ limit: 1, clock });
  const invalidOutbox = await primary!.accountDeletionEmailOutbox.findUniqueOrThrow({ where: { accountDeletionRequestId: invalid.id } });
  assert.equal(invalidOutbox.status, "RECONCILIATION_REQUIRED");
  assert.equal(invalidOutbox.safeErrorCode, "COMPLETION_EMAIL_RECONCILIATION_REQUIRED");
  emailMode = "success";
  checkpoint("email-provider-window-and-409-reconciliation");
}

async function verifyStructuredProviderErrorHandling() {
  const { runAccountDeletionWorker } = await import("@/lib/account-deletion-service");
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const now = new Date("2026-03-07T00:00:00.000Z");
  const clock = () => now;
  authMode = "success";
  emailMode = "success";

  storageMode = "no-such-key";
  const directStorageResult = await createSupabaseAdminClient()!.storage.from("vehicle-images").remove(["missing-object.jpg"]);
  const directStorageError = directStorageResult.error as { status?: unknown; statusCode?: unknown; code?: unknown; error?: unknown } | null;
  assert.equal(directStorageError?.status, 404);
  assert.equal(directStorageError?.statusCode, "NoSuchKey");

  const missingObject = await createOperation({ withImage: true });
  await isolateOperation(missingObject.id);
  storageMode = "no-such-key";
  providerNow = now;
  await runAccountDeletionWorker({ limit: 1, clock });
  const missingObjectState = await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id: missingObject.id } });
  assert.equal(missingObjectState.stage, "COMPLETED", missingObjectState.safeErrorCode ?? "missing-object state");

  for (const mode of ["no-such-bucket", "tenant-not-found", "unknown-not-found"] as const) {
    const operation = await createOperation({ withImage: true });
    await isolateOperation(operation.id);
    const authBefore = externalCalls.auth;
    storageMode = mode;
    await runAccountDeletionWorker({ limit: 1, clock });
    const request = await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id: operation.id } });
    assert.equal(request.stage, "FAILED_RETRYABLE", mode);
    assert.equal(request.storageCompletedAt, null, mode);
    assert.equal(externalCalls.auth, authBefore, mode);
  }
  storageMode = "success";

  const exactMissingUser = await createOperation({ stage: "AUTH_PENDING", storageCompleted: true, databaseCompleted: true });
  await isolateOperation(exactMissingUser.id);
  authMode = "not-found";
  await runAccountDeletionWorker({ limit: 1, clock });
  assert.equal((await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id: exactMissingUser.id } })).stage, "COMPLETED");

  const genericMissingUser = await createOperation({ stage: "AUTH_PENDING", storageCompleted: true, databaseCompleted: true });
  await isolateOperation(genericMissingUser.id);
  authMode = "generic-not-found";
  await runAccountDeletionWorker({ limit: 1, clock });
  assert.equal((await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id: genericMissingUser.id } })).stage, "AUTH_DELETE_RETRY");

  const providerMismatch = await createOperation({ stage: "AUTH_PENDING", storageCompleted: true, databaseCompleted: true });
  await isolateOperation(providerMismatch.id);
  const originalProviderUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const authBeforeMismatch = externalCalls.auth;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:59998";
  try {
    await runAccountDeletionWorker({ limit: 1, clock });
  } finally {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalProviderUrl;
  }
  const mismatch = await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id: providerMismatch.id } });
  assert.equal(mismatch.stage, "FAILED_FINAL");
  assert.equal(mismatch.safeErrorCode, "AUTH_PROVIDER_IDENTITY_MISMATCH");
  assert.equal(externalCalls.auth, authBeforeMismatch);
  authMode = "success";
  checkpoint("structured-storage-and-auth-provider-errors");
}

async function verifyDatabaseCommitPointLegalHold() {
  const service = await import("@/lib/account-deletion-service");
  const holdClient = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  await holdClient.$connect();
  const now = new Date("2026-03-08T00:00:00.000Z");
  const clock = () => now;
  authMode = "success";
  emailMode = "success";
  try {
    const committed = await createOperation({ stage: "DATABASE_PENDING", storageCompleted: true });
    await isolateOperation(committed.id);
    let arrived: () => void = () => undefined;
    const markerWritten = new Promise<void>((resolve) => { arrived = resolve; });
    let release: () => void = () => undefined;
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    const authBefore = externalCalls.auth;
    const emailBefore = externalCalls.email;
    const worker = service.runAccountDeletionWorker({
      limit: 1,
      clock,
      hooks: { afterDatabaseCommitMarkerBeforePurge: async () => { arrived(); await barrier; } },
    });
    await markerWritten;
    const hold = service.setAccountDeletionLegalHold({ requestId: committed.id, active: true, reason: "database-commit-point", now }, holdClient);
    await new Promise((resolve) => setTimeout(resolve, 25));
    release();
    await worker;
    const result = await hold;
    assert.equal(result.status, "COMMIT_POINT_PASSED");
    if (result.status === "COMMIT_POINT_PASSED") assert.deepEqual(result.sideEffects, ["database"]);
    const committedState = await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id: committed.id } });
    assert.equal(committedState.legalHold, true);
    assert.notEqual(committedState.databaseCompletedAt, null);
    assert.equal(committedState.stage, "AUTH_PENDING");
    assert.equal(externalCalls.auth, authBefore);
    assert.equal(externalCalls.email, emailBefore);
    assert.equal((await service.setAccountDeletionLegalHold({ requestId: committed.id, active: false, now }, holdClient)).status, "CLEARED");
    const resumeClock = () => new Date(now.getTime() + 5 * 60 * 1000 + 1);
    await service.runAccountDeletionWorker({ limit: 1, clock: resumeClock });
    assert.equal((await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id: committed.id } })).stage, "COMPLETED");

    const rollback = await createOperation({ stage: "DATABASE_PENDING", storageCompleted: true });
    await isolateOperation(rollback.id);
    await primary!.user.delete({ where: { id: rollback.authUserId } });
    await service.runAccountDeletionWorker({ limit: 1, clock });
    const rollbackState = await primary!.accountDeletionRequest.findUniqueOrThrow({ where: { id: rollback.id } });
    assert.equal(rollbackState.databaseCompletedAt, null);
    assert.equal((await service.setAccountDeletionLegalHold({ requestId: rollback.id, active: true, reason: "database-rollback", now }, holdClient)).status, "APPLIED");
  } finally {
    await holdClient.$disconnect();
  }
  checkpoint("database-commit-marker-legal-hold");
}

async function main() {
  const serverOnlyShimDirectory = join(testDirectory, "server-only");
  mkdirSync(serverOnlyShimDirectory);
  writeFileSync(join(serverOnlyShimDirectory, "index.js"), "");
  process.env.NODE_PATH = testDirectory;
  (Module as unknown as { _initPaths(): void })._initPaths();
  process.env.DATABASE_URL = databaseUrl;
  process.env.ACCOUNT_DELETION_CODE_PEPPER = "disposable-test-pepper";
  process.env.ACCOUNT_DELETION_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64url");
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:59999";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "disposable-public-key";
  const serviceRoleEnvironmentKey = ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");
  process.env[serviceRoleEnvironmentKey] = "disposable-service-key";
  process.env.RESEND_API_KEY = "disposable-email-key";
  process.env.EMAIL_FROM = "noreply@invalid.local";
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes("api.resend.com")) {
      externalCalls.email += 1;
      const headers = new Headers(init?.headers);
      const key = headers.get("Idempotency-Key") ?? "missing-email-idempotency-key";
      const payload = typeof init?.body === "string" ? init.body : "";
      transportEffectKeys.email.push(key);
      if (emailMode === "failure") return new Response("{}", { status: 503 });
      if (emailMode === "concurrent") return new Response(JSON.stringify({ name: "concurrent_idempotent_requests" }), { status: 409 });
      if (emailMode === "invalid") return new Response(JSON.stringify({ name: "invalid_idempotent_request" }), { status: 409 });
      const prior = emailProviderDeliveries.get(key);
      if (prior && providerNow.getTime() - prior.acceptedAt < 24 * 60 * 60 * 1000) {
        if (prior.payload !== payload) return new Response(JSON.stringify({ name: "invalid_idempotent_request" }), { status: 409 });
        return new Response(JSON.stringify({ id: prior.messageId }), { status: 200 });
      }
      const messageId = `email-${emailProviderDeliveries.size + 1}`;
      emailProviderDeliveries.set(key, { payload, acceptedAt: providerNow.getTime(), messageId });
      logicalEffects.email.add(key);
      return new Response(JSON.stringify({ id: messageId }), { status: 200 });
    }
    if (url.includes("/auth/v1/admin/users/")) {
      externalCalls.auth += 1;
      transportEffectKeys.auth.push(url);
      if (authMode === "success" || authMode === "not-found") logicalEffects.auth.add(url);
      if (authMode === "success") return new Response("{}", { status: 200 });
      const authErrorHeaders = { "X-Supabase-Api-Version": "2024-01-01" };
      if (authMode === "not-found") return new Response(JSON.stringify({ code: "user_not_found" }), { status: 404, headers: authErrorHeaders });
      if (authMode === "generic-not-found") return new Response(JSON.stringify({ code: "unexpected_not_found" }), { status: 404, headers: authErrorHeaders });
      return new Response("{}", { status: 503 });
    }
    if (url.includes("/storage/v1/object/")) {
      externalCalls.storage += 1;
      const key = typeof init?.body === "string" ? init.body : url;
      transportEffectKeys.storage.push(key);
      if (storageMode === "success" || storageMode === "no-such-key") logicalEffects.storage.add(key);
      if (storageMode === "success") return new Response("{}", { status: 200 });
      const code = storageMode === "no-such-key" ? "NoSuchKey"
        : storageMode === "no-such-bucket" ? "NoSuchBucket"
          : storageMode === "tenant-not-found" ? "TenantNotFound"
            : "UnknownNotFound";
      return new Response(JSON.stringify({ code, error: code, message: code }), { status: 404 });
    }
    return new Response("{}", { status: 200 });
  };

  try {
    mkdirSync(socketDirectory);
    command(pg("initdb"), ["-D", dataDirectory, "--no-locale", "--encoding=UTF8"]);
    command(pg("pg_ctl"), ["-D", dataDirectory, "-o", `-h 127.0.0.1 -p ${port} -k ${socketDirectory}`, "-w", "start"], process.env, false);
    command(pg("createdb"), ["-h", "127.0.0.1", "-p", String(port), database]);
    command("./node_modules/.bin/prisma", ["migrate", "deploy"], { ...process.env, CI: "1", PRISMA_HIDE_UPDATE_MESSAGE: "1" });
    primary = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await primary.$connect();

    await verifyMigrationMetadata();
    await verifyUpgradeMigration();
    await verifyRollback();
    await verifyLeaseExpiryAndStaleOwner();
    await verifyConcurrentClaims();
    await verifyInFlightLegalHolds();
    await verifyDurableReservationOrdering();
    await verifyInvocationTakeoverIdempotency();
    await verifyDurableFuturePhaseHold();
    await verifyExpiredReservationRecovery();
    await verifyProviderReconciliationBoundaries();
    await verifyStructuredProviderErrorHandling();
    await verifyDatabaseCommitPointLegalHold();
    await verifyCancellationAndScheduledDeletion();
    await verifyOutboxUniqueness();
    await verifyServiceRecovery();
    await verifyReceiptStatusRateLimiter();
    console.log("account-deletion-postgres integration passed");
  } finally {
    globalThis.fetch = realFetch;
    await primary?.$disconnect();
    try { command(pg("pg_ctl"), ["-D", dataDirectory, "-m", "fast", "-w", "stop"], process.env, false); } catch { /* cleanup is best effort after a test failure */ }
    rmSync(testDirectory, { recursive: true, force: true });
  }
}

void main();
