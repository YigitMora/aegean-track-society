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
let authMode: "success" | "not-found" | "failure" = "success";
let emailMode: "success" | "failure" = "success";
let externalCalls = { auth: 0, email: 0, storage: 0 };

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
  command("./node_modules/.bin/prisma", ["migrate", "deploy", "--schema", join(upgradePrismaDirectory, "schema.prisma")], {
    ...process.env, DATABASE_URL: upgradeUrl, CI: "1", PRISMA_HIDE_UPDATE_MESSAGE: "1",
  });
  psql("INSERT INTO \"AccountDeletionRequest\" (id, \"authUserIdHash\", \"updatedAt\") VALUES ('upgrade-preserved', 'upgrade-hash', NOW())", upgradeDatabase);
  command("./node_modules/.bin/prisma", ["migrate", "deploy"], {
    ...process.env, DATABASE_URL: upgradeUrl, CI: "1", PRISMA_HIDE_UPDATE_MESSAGE: "1",
  });
  assert.equal(psql("SELECT \"operationVersion\" FROM \"AccountDeletionRequest\" WHERE id = 'upgrade-preserved'", upgradeDatabase), "0");
  assert.equal(psql("SELECT count(*) FROM _prisma_migrations WHERE migration_name = '20260728170000_account_deletion_recovery' AND finished_at IS NOT NULL", upgradeDatabase), "1");
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
    prepare?: (operation: { id: string }) => Promise<void>;
  }> = [
    { name: "storage", operation: { withImage: true }, hook: "afterStorageReservationBeforeAdapter", callKey: "storage" },
    { name: "auth", operation: { stage: "AUTH_PENDING", storageCompleted: true, databaseCompleted: true }, hook: "afterAuthReservationBeforeAdapter", callKey: "auth" },
    {
      name: "completion_email", operation: {}, hook: "afterCompletionEmailReservationBeforeAdapter", callKey: "email",
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
      assert.equal((await service.setAccountDeletionLegalHold({ requestId: operation.id, active: true, reason: "hold-wins-test", now }, holdClient)).status, "APPLIED");
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
  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes("api.resend.com")) {
      externalCalls.email += 1;
      return new Response("{}", { status: emailMode === "success" ? 200 : 503 });
    }
    if (url.includes("/auth/v1/admin/users/")) {
      externalCalls.auth += 1;
      return new Response("{}", { status: authMode === "success" ? 200 : authMode === "not-found" ? 404 : 503 });
    }
    if (url.includes("/storage/v1/object/")) {
      externalCalls.storage += 1;
      return new Response("{}", { status: 200 });
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
    await verifyExpiredReservationRecovery();
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
