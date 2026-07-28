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
let externalCalls = { auth: 0, email: 0 };

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

async function createOperation(stage: "VERIFIED" | "AUTH_DELETE_RETRY" = "VERIFIED") {
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
      stage,
      nextAttemptAt: new Date(0),
    },
  });
  return { id, authUserId };
}

async function verifyMigrationMetadata() {
  assert.equal(psql("SELECT count(*) FROM _prisma_migrations WHERE migration_name = '20260728170000_account_deletion_recovery' AND finished_at IS NOT NULL"), "1");
  assert.equal(psql("SELECT count(*) FROM information_schema.columns WHERE table_name = 'AccountDeletionRequest' AND column_name IN ('operationReceiptHash', 'encryptedAuthUserId', 'encryptedEmail', 'executionLeaseId', 'executionLeaseExpiresAt', 'operationVersion', 'nextAttemptAt', 'purgeAfter')"), "8");
  assert.equal(psql("SELECT count(*) FROM pg_indexes WHERE tablename = 'AccountDeletionEmailOutbox' AND indexname = 'AccountDeletionEmailOutbox_accountDeletionRequestId_key'"), "1");
  checkpoint("fresh-migration-metadata");
}

async function verifyUpgradeMigration() {
  const upgradePrismaDirectory = join(testDirectory, "upgrade-prisma");
  const upgradeUrl = `postgresql://${databaseUser}@127.0.0.1:${port}/${upgradeDatabase}?schema=public`;
  command(pg("createdb"), ["-h", "127.0.0.1", "-p", String(port), upgradeDatabase]);
  command("cp", ["-R", "prisma", upgradePrismaDirectory]);
  rmSync(join(upgradePrismaDirectory, "migrations", "20260728170000_account_deletion_recovery"), { recursive: true });
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

async function verifyLeaseAndStaleOwner() {
  const { id } = await createOperation();
  const activeLease = randomUUID();
  await primary!.accountDeletionRequest.update({ where: { id }, data: { executionLeaseId: activeLease, executionLeaseExpiresAt: new Date(Date.now() + 60_000) } });
  const blocked = await primary!.accountDeletionRequest.updateMany({
    where: { id, executionLeaseExpiresAt: { lte: new Date() } }, data: { executionLeaseId: randomUUID() },
  });
  assert.equal(blocked.count, 0);
  await primary!.accountDeletionRequest.update({ where: { id }, data: { executionLeaseExpiresAt: new Date(0) } });
  const replacementLease = randomUUID();
  const taken = await primary!.accountDeletionRequest.updateMany({
    where: { id, stage: "VERIFIED", executionLeaseExpiresAt: { lte: new Date() } },
    data: { executionLeaseId: replacementLease, executionLeaseExpiresAt: new Date(Date.now() + 60_000) },
  });
  assert.equal(taken.count, 1);
  const stale = await primary!.accountDeletionRequest.updateMany({
    where: { id, executionLeaseId: activeLease, stage: "VERIFIED" }, data: { stage: "STORAGE_PENDING" },
  });
  assert.equal(stale.count, 0);
  checkpoint("active-expired-and-stale-lease");
}

async function verifyConcurrentClaims() {
  for (let iteration = 0; iteration < 20; iteration += 1) {
    const { id } = await createOperation();
    const contenders = [
      new PrismaClient({ datasources: { db: { url: databaseUrl } } }),
      new PrismaClient({ datasources: { db: { url: databaseUrl } } }),
    ];
    let arrived = 0;
    let release: () => void = () => undefined;
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    const claim = async (client: PrismaClient) => {
      arrived += 1;
      if (arrived === contenders.length) release();
      await barrier;
      return client.accountDeletionRequest.updateMany({
        where: { id, stage: "VERIFIED", executionLeaseExpiresAt: null },
        data: { executionLeaseId: randomUUID(), executionLeaseExpiresAt: new Date(Date.now() + 60_000) },
      });
    };
    const result = await Promise.all(contenders.map(claim));
    await Promise.all(contenders.map((client) => client.$disconnect()));
    assert.equal(result[0].count + result[1].count, 1, `iteration ${iteration}`);
  }
  checkpoint("concurrent-cas-20x");
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
    await verifyLeaseAndStaleOwner();
    await verifyConcurrentClaims();
    await verifyOutboxUniqueness();
    await verifyServiceRecovery();
    console.log("account-deletion-postgres integration passed");
  } finally {
    globalThis.fetch = realFetch;
    await primary?.$disconnect();
    try { command(pg("pg_ctl"), ["-D", dataDirectory, "-m", "fast", "-w", "stop"], process.env, false); } catch { /* cleanup is best effort after a test failure */ }
    rmSync(testDirectory, { recursive: true, force: true });
  }
}

void main();
