import "server-only";

import type { AdminRole } from "@prisma/client";
import { redirect } from "next/navigation";
import {
  type AdminAuthSource,
  getAdminSession,
  requireAdminSession,
  requireAdminSessionWithReturn,
  type AdminSession,
} from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export type AdminCapability =
  | "members.read"
  | "garages.manage"
  | "registrations.read"
  | "registrations.manage"
  | "payments.manage"
  | "checkin.manage"
  | "events.manage"
  | "admins.manage";

export type AdminActor = {
  id: string;
  email: string;
  role: AdminRole;
  authSource: AdminAuthSource;
};

const ownerCapabilities = new Set<AdminCapability>([
  "members.read",
  "garages.manage",
  "registrations.read",
  "registrations.manage",
  "payments.manage",
  "checkin.manage",
  "events.manage",
  "admins.manage",
]);

const checkinCapabilities = new Set<AdminCapability>([
  "registrations.read",
  "checkin.manage",
]);

const staffCapabilities = new Set<AdminCapability>([
  "members.read",
  "registrations.read",
  "checkin.manage",
]);

const noCapabilities = new Set<AdminCapability>();

export function normalizeAdminEmail(email: string) {
  return email.trim().toLowerCase();
}

export function adminCapabilitiesForRole(role: unknown): ReadonlySet<AdminCapability> {
  if (role === "OWNER") {
    return ownerCapabilities;
  }

  if (role === "CHECKIN") {
    return checkinCapabilities;
  }

  if (role === "STAFF") {
    return staffCapabilities;
  }

  return noCapabilities;
}

export function adminHasCapability(role: unknown, capability: AdminCapability) {
  return adminCapabilitiesForRole(role).has(capability);
}

export function isOwnerAdmin(role: unknown): role is "OWNER" {
  return role === "OWNER";
}

export async function getCurrentAdminActor() {
  const session = await getAdminSession();

  if (!session) {
    return null;
  }

  return findAdminActorForSession(session);
}

export async function getAdminActorForRoute() {
  return getCurrentAdminActor();
}

export async function getAdminActorFromOwnerSession() {
  const session = await getAdminSession();

  if (session?.authSource !== "OWNER_SESSION") {
    return null;
  }

  return findAdminActorForSession(session);
}

export async function getAdminActorFromMemberSession() {
  const session = await getAdminSession();

  if (session?.authSource !== "MEMBER_SESSION") {
    return null;
  }

  return findAdminActorForSession(session);
}

export async function requireAdminCapability(
  capability: AdminCapability,
  options?: { returnTo?: string; deniedPath?: string },
) {
  const session = options?.returnTo
    ? await requireAdminSessionWithReturn(options.returnTo)
    : await requireAdminSession();
  const adminActor = await findAdminActorForSession(session);

  if (!adminActor || !adminHasCapability(adminActor.role, capability)) {
    redirect(options?.deniedPath ?? adminDeniedPath(adminActor));
  }

  return adminActor;
}

export async function requireAdminRole(roles: readonly AdminRole[]) {
  const session = await requireAdminSession();
  const adminActor = await findAdminActorForSession(session);

  if (!adminActor || !roles.includes(adminActor.role)) {
    redirect(adminDeniedPath(adminActor));
  }

  return adminActor;
}

export async function requireOwnerAdmin() {
  const adminActor = await requireAdminRole(["OWNER"]);

  if (adminActor.authSource !== "OWNER_SESSION") {
    redirect("/admin/login?teamError=owner_login_required");
  }

  return adminActor;
}

export async function requireCheckinOrOwner(returnTo?: string) {
  return requireAdminCapability("checkin.manage", { returnTo });
}

export async function requireMemberLinkedAdmin() {
  const session = await requireAdminSession();
  const adminActor = await findAdminActorForSession(session);

  if (!adminActor || adminActor.authSource !== "MEMBER_SESSION") {
    redirect("/admin/login?teamError=member_admin_not_assigned");
  }

  return adminActor;
}

export function adminDefaultPathForRole(role: unknown) {
  if (role === "OWNER") {
    return "/admin";
  }

  if (role === "STAFF") {
    return "/admin/members";
  }

  if (role === "CHECKIN") {
    return "/admin/participants";
  }

  return "/admin/login";
}

function adminDeniedPath(adminActor: AdminActor | null) {
  if (adminActor?.role === "STAFF" || adminActor?.role === "CHECKIN") {
    return `${adminDefaultPathForRole(adminActor.role)}?adminError=permission_denied`;
  }

  return "/admin/login";
}

async function findAdminActorForSession(session: AdminSession): Promise<AdminActor | null> {
  const adminUser = await prisma.adminUser.findUnique({
    where: {
      email: normalizeAdminEmail(session.email),
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  if (!adminUser) {
    return null;
  }

  if (session.authSource === "OWNER_SESSION" && adminUser.role !== "OWNER") {
    return null;
  }

  if (
    session.authSource === "MEMBER_SESSION" &&
    adminUser.role !== "STAFF" &&
    adminUser.role !== "CHECKIN"
  ) {
    return null;
  }

  return {
    ...adminUser,
    authSource: session.authSource,
  };
}
