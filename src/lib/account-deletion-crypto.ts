import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { AccountDeletionError } from "@/lib/mobile-account-deletion-contract";

const algorithm = "aes-256-gcm";

function encryptionKey() {
  const encoded = process.env.ACCOUNT_DELETION_ENCRYPTION_KEY?.trim();
  if (!encoded) throw new AccountDeletionError("ACCOUNT_DELETION_CONFIGURATION_ERROR");

  const key = Buffer.from(encoded, "base64url");
  if (key.length !== 32) throw new AccountDeletionError("ACCOUNT_DELETION_CONFIGURATION_ERROR");
  return key;
}

export function encryptAccountDeletionValue(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

export function decryptAccountDeletionValue(ciphertext: string) {
  try {
    const payload = Buffer.from(ciphertext, "base64url");
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const body = payload.subarray(28);
    if (iv.length !== 12 || tag.length !== 16 || !body.length) throw new Error("invalid payload");

    const decipher = createDecipheriv(algorithm, encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
  } catch (error) {
    if (error instanceof AccountDeletionError) throw error;
    throw new AccountDeletionError("ACCOUNT_DELETION_CONFIGURATION_ERROR");
  }
}
