import "server-only";

import type { AdminRole } from "@prisma/client";
import { redirect } from "next/navigation";
import {
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
  return requireAdminRole(["OWNER"]);
}

export async function requireCheckinOrOwner(returnTo?: string) {
  return requireAdminCapability("checkin.manage", { returnTo });
}

function adminDeniedPath(adminActor: AdminActor | null) {
  if (adminActor?.role === "CHECKIN") {
    return "/admin/check-in?adminError=permission_denied";
  }

  return "/admin/login";
}

async function findAdminActorForSession(session: AdminSession): Promise<AdminActor | null> {
  return prisma.adminUser.findUnique({
    where: {
      email: normalizeAdminEmail(session.email),
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });
}
