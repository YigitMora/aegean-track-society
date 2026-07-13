import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";

const adminCookieName = "atd_admin_session";
const sessionDurationMs = 1000 * 60 * 60 * 8;

export type AdminAuthSource = "OWNER_SESSION" | "MEMBER_SESSION";

export type AdminSession = {
  email: string;
  expiresAt: number;
  authSource: AdminAuthSource;
};

export async function getAdminSession() {
  const cookieStore = await cookies();
  const value = cookieStore.get(adminCookieName)?.value;

  if (!value) {
    return null;
  }

  const session = verifySessionCookie(value);

  if (!session) {
    return null;
  }

  return session;
}

export async function requireAdminSession() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return session;
}

export async function requireAdminSessionWithReturn(returnTo: string) {
  const session = await getAdminSession();

  if (!session) {
    redirect(`/admin/login?returnTo=${encodeURIComponent(normalizeAdminReturnTo(returnTo))}`);
  }

  return session;
}

export async function requireAdminSessionForRoute() {
  const session = await getAdminSession();

  if (!session) {
    return null;
  }

  return session;
}

export async function createAdminSessionCookie(
  email: string,
  options: { authSource?: AdminAuthSource } = {},
) {
  const cookieStore = await cookies();
  const expiresAt = Date.now() + sessionDurationMs;
  const payload = Buffer.from(
    JSON.stringify({
      email: email.trim().toLowerCase(),
      expiresAt,
      authSource: options.authSource ?? "OWNER_SESSION",
    }),
  ).toString("base64url");
  const signature = sign(payload);

  cookieStore.set(adminCookieName, `${payload}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function createMemberAdminSessionCookie(email: string) {
  return createAdminSessionCookie(email, { authSource: "MEMBER_SESSION" });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set(adminCookieName, "", expiredAdminCookieOptions("/"));
  cookieStore.set(adminCookieName, "", expiredAdminCookieOptions("/admin"));
}

export function expireAdminSessionCookieOnResponse(response: NextResponse) {
  response.cookies.set(adminCookieName, "", expiredAdminCookieOptions("/"));
  response.cookies.set(adminCookieName, "", expiredAdminCookieOptions("/admin"));
}

function expiredAdminCookieOptions(path: "/" | "/admin") {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path,
    expires: new Date(0),
    maxAge: 0,
  } as const;
}

export function verifyAdminCredentials(email: string, password: string) {
  const configuredEmail = process.env.ADMIN_EMAIL;
  const configuredPassword = process.env.ADMIN_PASSWORD;

  if (!configuredEmail || !configuredPassword) {
    return false;
  }

  return (
    safeEqual(email.trim().toLowerCase(), configuredEmail.trim().toLowerCase()) &&
    safeEqual(password, configuredPassword)
  );
}

export function normalizeAdminReturnTo(value: string | null | undefined) {
  if (!value || value.length > 2048 || !value.startsWith("/") || value.startsWith("//")) {
    return "/admin";
  }

  if (value.startsWith("/admin") || value.startsWith("/check-in/")) {
    return value;
  }

  return "/admin";
}

function verifySessionCookie(value: string): AdminSession | null {
  const [payload, signature] = value.split(".");

  if (!payload || !signature || !safeEqual(signature, sign(payload))) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<AdminSession>;

    if (!parsed.email || !parsed.expiresAt || parsed.expiresAt <= Date.now()) {
      return null;
    }

    const authSource = parseAdminAuthSource(parsed.authSource);

    if (!authSource) {
      return null;
    }

    return {
      email: parsed.email.trim().toLowerCase(),
      expiresAt: parsed.expiresAt,
      authSource,
    };
  } catch {
    return null;
  }
}

function parseAdminAuthSource(value: unknown): AdminAuthSource | null {
  if (value === undefined) {
    return "OWNER_SESSION";
  }

  if (value === "OWNER_SESSION" || value === "MEMBER_SESSION") {
    return value;
  }

  return null;
}

function sign(payload: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not configured.");
  }

  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
