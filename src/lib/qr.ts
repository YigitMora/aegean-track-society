import { createHash, randomBytes } from "node:crypto";
import QRCode from "qrcode";

export function generateQrToken() {
  return randomBytes(32).toString("base64url");
}

export function hashQrToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function buildCheckInUrl(rawToken: string) {
  return new URL(`/check-in/${rawToken}`, getRequiredEnv("NEXT_PUBLIC_APP_URL")).toString();
}

export async function generateQrPngBase64(checkInUrl: string) {
  const dataUrl = await QRCode.toDataURL(checkInUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    scale: 8,
    type: "image/png",
  });

  return dataUrl.replace(/^data:image\/png;base64,/, "");
}

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}
