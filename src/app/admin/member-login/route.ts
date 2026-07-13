import type { AdminRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { createMemberAdminSessionCookie, clearAdminSessionCookie } from "@/lib/admin-auth";
import { adminDefaultPathForRole, normalizeAdminEmail } from "@/lib/admin-authorization";
import { ensureMemberUser, getVerifiedSupabaseUser, normalizeMemberReturnTo } from "@/lib/member-auth";
import { prisma } from "@/lib/prisma";
import { getClientIpFromRequest } from "@/lib/request-ip";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedReturnTo = normalizeRestrictedAdminReturnTo(url.searchParams.get("returnTo"));
  const loginReturnTo = normalizeMemberReturnTo(
    `/admin/member-login?returnTo=${encodeURIComponent(requestedReturnTo)}`,
  );
  const ipAddress = getClientIpFromRequest(request);
  const supabaseUser = await getVerifiedSupabaseUser();

  if (!supabaseUser) {
    return redirectTo(
      request,
      `/auth/login?returnTo=${encodeURIComponent(loginReturnTo)}`,
    );
  }

  try {
    const memberUser = await ensureMemberUser(supabaseUser);

    if (memberUser.status !== "ACTIVE" || memberUser.deletedAt) {
      await clearAdminSessionCookie();
      return deniedRedirect(request, "member_admin_not_assigned");
    }

    const normalizedEmail = normalizeAdminEmail(memberUser.email);
    const adminUser = await prisma.adminUser.findUnique({
      where: {
        email: normalizedEmail,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!adminUser) {
      await writeMemberLoginAudit({
        action: "ADMIN_MEMBER_LOGIN_DENIED",
        targetUserId: memberUser.id,
        targetEmail: normalizedEmail,
        reason: "member_admin_not_assigned",
        ipAddress,
      });
      await clearAdminSessionCookie();
      return deniedRedirect(request, "member_admin_not_assigned");
    }

    if (adminUser.role === "OWNER") {
      await writeMemberLoginAudit({
        action: "ADMIN_MEMBER_LOGIN_DENIED",
        adminUserId: adminUser.id,
        targetUserId: memberUser.id,
        targetEmail: normalizedEmail,
        role: adminUser.role,
        reason: "owner_login_required",
        ipAddress,
      });
      await clearAdminSessionCookie();
      return deniedRedirect(request, "owner_login_required");
    }

    if (!isMemberLinkedAdminRole(adminUser.role)) {
      await writeMemberLoginAudit({
        action: "ADMIN_MEMBER_LOGIN_DENIED",
        adminUserId: adminUser.id,
        targetUserId: memberUser.id,
        targetEmail: normalizedEmail,
        role: adminUser.role,
        reason: "invalid_role",
        ipAddress,
      });
      await clearAdminSessionCookie();
      return deniedRedirect(request, "member_admin_not_assigned");
    }

    await createMemberAdminSessionCookie(adminUser.email);
    await writeMemberLoginAudit({
      action: "ADMIN_MEMBER_LOGIN_GRANTED",
      adminUserId: adminUser.id,
      targetUserId: memberUser.id,
      targetEmail: normalizedEmail,
      role: adminUser.role,
      reason: "member_admin_login_granted",
      ipAddress,
    });

    return redirectTo(
      request,
      destinationForMemberAdmin(adminUser.role, requestedReturnTo),
    );
  } catch {
    await clearAdminSessionCookie();
    return deniedRedirect(request, "failed");
  }
}

function destinationForMemberAdmin(role: AdminRole, requestedReturnTo: string) {
  if (role === "STAFF" && isStaffReturnPath(requestedReturnTo)) {
    return requestedReturnTo;
  }

  if (role === "CHECKIN" && isCheckinReturnPath(requestedReturnTo)) {
    return requestedReturnTo;
  }

  return adminDefaultPathForRole(role);
}

function isStaffReturnPath(value: string) {
  return (
    value === "/admin/members" ||
    value.startsWith("/admin/members/") ||
    isCheckinReturnPath(value)
  );
}

function isCheckinReturnPath(value: string) {
  return (
    value === "/admin/participants" ||
    value.startsWith("/admin/participants/") ||
    value === "/admin/check-in" ||
    value.startsWith("/admin/check-in?") ||
    value.startsWith("/check-in/")
  );
}

function normalizeRestrictedAdminReturnTo(value: string | null) {
  if (!value || value.length > 2048 || !value.startsWith("/") || value.startsWith("//")) {
    return "/admin";
  }

  if (isStaffReturnPath(value) || value === "/admin") {
    return value;
  }

  return "/admin";
}

function isMemberLinkedAdminRole(role: AdminRole) {
  return role === "STAFF" || role === "CHECKIN";
}

function deniedRedirect(request: Request, code: string) {
  return redirectTo(request, `/admin/login?teamError=${encodeURIComponent(code)}`);
}

function redirectTo(request: Request, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url), {
    status: 303,
  });
}

async function writeMemberLoginAudit({
  action,
  adminUserId,
  targetUserId,
  targetEmail,
  role,
  reason,
  ipAddress,
}: {
  action: "ADMIN_MEMBER_LOGIN_GRANTED" | "ADMIN_MEMBER_LOGIN_DENIED";
  adminUserId?: string;
  targetUserId: string;
  targetEmail: string;
  role?: AdminRole;
  reason: string;
  ipAddress: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      adminUserId,
      action,
      after: {
        targetUserId,
        targetEmail,
        role: role ?? null,
        reason,
      },
      reason,
      ipAddress,
    },
  });
}
