"use server";

import type { AdminRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeAdminEmail, requireOwnerAdmin } from "@/lib/admin-authorization";
import { prisma } from "@/lib/prisma";
import { getRequestIpAddress } from "@/lib/request-ip";

export async function assignAdminRoleAction(formData: FormData) {
  const owner = await requireOwnerAdmin();
  const userId = normalizeText(formData.get("userId"));
  const role = parseAssignableRole(formData.get("role"));

  if (!userId) {
    redirectWithTeamError("member_not_found");
  }

  if (!role) {
    redirectWithTeamError("invalid_role");
  }

  const member = await prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null,
    },
    select: {
      id: true,
      email: true,
      status: true,
      profile: {
        select: {
          fullName: true,
        },
      },
    },
  });

  if (!member?.email) {
    redirectWithTeamError("member_not_found");
  }

  const targetEmail = normalizeAdminEmail(member.email);
  const existingAdmin = await prisma.adminUser.findUnique({
    where: {
      email: targetEmail,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (existingAdmin?.role === "OWNER") {
    redirectWithTeamError("owner_protected");
  }

  if (existingAdmin?.role === role) {
    redirectWithTeamError("admin_already_assigned");
  }

  const ipAddress = await getRequestIpAddress();
  const name = member.profile?.fullName ?? targetEmail;

  if (existingAdmin) {
    await prisma.$transaction([
      prisma.adminUser.update({
        where: {
          id: existingAdmin.id,
        },
        data: {
          name,
          role,
        },
      }),
      prisma.auditLog.create({
        data: {
          adminUserId: owner.id,
          action: "ADMIN_ROLE_CHANGED",
          before: {
            targetAdminUserId: existingAdmin.id,
            targetUserId: member.id,
            targetEmail,
            oldRole: existingAdmin.role,
          },
          after: {
            targetAdminUserId: existingAdmin.id,
            targetUserId: member.id,
            targetEmail,
            newRole: role,
          },
          reason: "Owner changed restricted admin role.",
          ipAddress,
        },
      }),
    ]);

    revalidateTeam();
    redirectWithTeamResult("changed");
  }

  const createdAdmin = await prisma.adminUser.create({
    data: {
      email: targetEmail,
      name,
      role,
    },
    select: {
      id: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      adminUserId: owner.id,
      action: "ADMIN_ACCESS_GRANTED",
      after: {
        targetAdminUserId: createdAdmin.id,
        targetUserId: member.id,
        targetEmail,
        oldRole: null,
        newRole: role,
      },
      reason: "Owner granted restricted admin access.",
      ipAddress,
    },
  });

  revalidateTeam();
  redirectWithTeamResult("granted");
}

export async function changeAdminRoleAction(adminUserId: string, formData: FormData) {
  const owner = await requireOwnerAdmin();
  const role = parseAssignableRole(formData.get("role"));

  if (!role) {
    redirectWithTeamError("invalid_role");
  }

  const targetAdmin = await prisma.adminUser.findUnique({
    where: {
      id: adminUserId,
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  if (!targetAdmin) {
    redirectWithTeamError("member_admin_not_assigned");
  }

  if (targetAdmin.role === "OWNER") {
    redirectWithTeamError("owner_protected");
  }

  if (targetAdmin.role === role) {
    redirectWithTeamError("admin_already_assigned");
  }

  const member = await findActiveMemberByEmail(targetAdmin.email);

  if (!member) {
    redirectWithTeamError("member_not_found");
  }

  const ipAddress = await getRequestIpAddress();

  await prisma.$transaction([
    prisma.adminUser.update({
      where: {
        id: targetAdmin.id,
      },
      data: {
        role,
        name: member.profile?.fullName ?? targetAdmin.email,
      },
    }),
    prisma.auditLog.create({
      data: {
        adminUserId: owner.id,
        action: "ADMIN_ROLE_CHANGED",
        before: {
          targetAdminUserId: targetAdmin.id,
          targetUserId: member.id,
          targetEmail: targetAdmin.email,
          oldRole: targetAdmin.role,
        },
        after: {
          targetAdminUserId: targetAdmin.id,
          targetUserId: member.id,
          targetEmail: targetAdmin.email,
          newRole: role,
        },
        reason: "Owner changed restricted admin role.",
        ipAddress,
      },
    }),
  ]);

  revalidateTeam();
  redirectWithTeamResult("changed");
}

export async function revokeAdminAccessAction(adminUserId: string, formData: FormData) {
  const owner = await requireOwnerAdmin();
  const confirmation = normalizeAdminEmail(String(formData.get("confirmation") ?? ""));
  const targetAdmin = await prisma.adminUser.findUnique({
    where: {
      id: adminUserId,
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  if (!targetAdmin) {
    redirectWithTeamError("member_admin_not_assigned");
  }

  if (targetAdmin.role === "OWNER") {
    redirectWithTeamError("owner_protected");
  }

  if (!isAssignableRole(targetAdmin.role)) {
    redirectWithTeamError("invalid_role");
  }

  if (confirmation !== normalizeAdminEmail(targetAdmin.email)) {
    redirectWithTeamError("confirmation_required");
  }

  const member = await findMemberByEmail(targetAdmin.email);
  const ipAddress = await getRequestIpAddress();

  await prisma.$transaction([
    prisma.adminUser.delete({
      where: {
        id: targetAdmin.id,
      },
    }),
    prisma.auditLog.create({
      data: {
        adminUserId: owner.id,
        action: "ADMIN_ACCESS_REVOKED",
        before: {
          targetAdminUserId: targetAdmin.id,
          targetUserId: member?.id ?? null,
          targetEmail: targetAdmin.email,
          oldRole: targetAdmin.role,
        },
        after: {
          targetAdminUserId: targetAdmin.id,
          targetUserId: member?.id ?? null,
          targetEmail: targetAdmin.email,
          newRole: null,
        },
        reason: "Owner revoked restricted admin access.",
        ipAddress,
      },
    }),
  ]);

  revalidateTeam();
  redirectWithTeamResult("revoked");
}

function parseAssignableRole(value: FormDataEntryValue | null): "STAFF" | "CHECKIN" | null {
  return isAssignableRole(value) ? value : null;
}

function isAssignableRole(value: unknown): value is "STAFF" | "CHECKIN" {
  return value === "STAFF" || value === "CHECKIN";
}

function normalizeText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized || null;
}

async function findActiveMemberByEmail(email: string) {
  return prisma.user.findFirst({
    where: {
      email: normalizeAdminEmail(email),
      deletedAt: null,
    },
    select: {
      id: true,
      profile: {
        select: {
          fullName: true,
        },
      },
    },
  });
}

async function findMemberByEmail(email: string) {
  return prisma.user.findUnique({
    where: {
      email: normalizeAdminEmail(email),
    },
    select: {
      id: true,
    },
  });
}

function revalidateTeam() {
  revalidatePath("/admin/team");
}

function redirectWithTeamResult(code: string): never {
  redirect(`/admin/team?teamResult=${encodeURIComponent(code)}`);
}

function redirectWithTeamError(code: string): never {
  redirect(`/admin/team?teamError=${encodeURIComponent(code)}`);
}
