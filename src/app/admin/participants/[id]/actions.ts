"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-auth";
import { sendRegistrationRejectedEmail } from "@/lib/email";
import { confirmManualRegistrationPayment } from "@/lib/manual-payment-confirmation";
import { prisma } from "@/lib/prisma";

export async function addAdminNote(registrationId: string, formData: FormData) {
  const session = await requireAdminSession();
  const body = String(formData.get("note") ?? "").trim();

  if (!body) {
    redirect(`/admin/participants/${registrationId}?actionResult=note_required`);
  }

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
    },
  });

  if (!registration) {
    redirect(`/admin/participants/${registrationId}?actionResult=not_found`);
  }

  const adminUser = await ensureAdminUser(session.email);
  const ipAddress = await getActionIpAddress();

  await prisma.adminNote.create({
    data: {
      registrationId,
      adminUserId: adminUser.id,
      authorLabel: session.email,
      body,
    },
  });

  await prisma.auditLog.create({
    data: {
      adminUserId: adminUser.id,
      registrationId,
      action: "ADMIN_NOTE_ADDED",
      after: {
        body,
      },
      reason: "Internal admin note added from participant detail page.",
      ipAddress,
    },
  });

  revalidatePath(`/admin/participants/${registrationId}`);
  redirect(`/admin/participants/${registrationId}?actionResult=note_added`);
}

export async function confirmManualPayment(registrationId: string) {
  const session = await requireAdminSession();
  const result = await confirmManualRegistrationPayment({
    registrationId,
    adminEmail: session.email,
    ipAddress: await getActionIpAddress(),
  });

  revalidatePath(`/admin/participants/${registrationId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/participants");
  redirect(
    `/admin/participants/${registrationId}?paymentResult=${encodeURIComponent(result.status)}`,
  );
}

export async function rejectRegistration(registrationId: string, formData: FormData) {
  const session = await requireAdminSession();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!reason) {
    redirect(`/admin/participants/${registrationId}?actionResult=reason_required`);
  }

  const adminUser = await ensureAdminUser(session.email);
  const ipAddress = await getActionIpAddress();
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      deletedAt: true,
      fullName: true,
      email: true,
      carBrandModel: true,
      plateNumber: true,
    },
  });

  if (!registration) {
    redirect(`/admin/participants/${registrationId}?actionResult=not_found`);
  }

  if (registration.deletedAt) {
    redirect(`/admin/participants/${registrationId}?actionResult=archived`);
  }

  if (registration.status === "CONFIRMED") {
    redirect(`/admin/participants/${registrationId}?actionResult=cannot_reject_confirmed`);
  }

  await prisma.registration.update({
    where: { id: registration.id },
    data: {
      status: "REJECTED",
    },
  });

  await prisma.auditLog.create({
    data: {
      adminUserId: adminUser.id,
      registrationId: registration.id,
      action: "REJECTED",
      before: {
        status: registration.status,
        paymentStatus: registration.paymentStatus,
      },
      after: {
        status: "REJECTED",
        reason,
      },
      reason,
      ipAddress,
    },
  });

  await sendRegistrationRejectedEmail({
    registrationId: registration.id,
    to: registration.email,
    fullName: registration.fullName,
    carBrandModel: registration.carBrandModel,
    plateNumber: registration.plateNumber,
    reason,
  });

  revalidatePath(`/admin/participants/${registrationId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/participants");
  redirect(`/admin/participants/${registrationId}?actionResult=rejected`);
}

export async function archiveRegistration(registrationId: string, formData: FormData) {
  const session = await requireAdminSession();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!reason) {
    redirect(`/admin/participants/${registrationId}?actionResult=reason_required`);
  }

  const adminUser = await ensureAdminUser(session.email);
  const ipAddress = await getActionIpAddress();
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      deletedAt: true,
      deletedByAdminId: true,
      deleteReason: true,
      status: true,
      paymentStatus: true,
    },
  });

  if (!registration) {
    redirect(`/admin/participants/${registrationId}?actionResult=not_found`);
  }

  if (registration.deletedAt) {
    redirect(`/admin/participants/${registrationId}?actionResult=already_archived`);
  }

  const deletedAt = new Date();

  await prisma.registration.update({
    where: { id: registration.id },
    data: {
      deletedAt,
      deletedByAdminId: adminUser.id,
      deleteReason: reason,
    },
  });

  await prisma.auditLog.create({
    data: {
      adminUserId: adminUser.id,
      registrationId: registration.id,
      action: "ARCHIVED",
      before: {
        deletedAt: null,
        deletedByAdminId: registration.deletedByAdminId,
        deleteReason: registration.deleteReason,
        status: registration.status,
        paymentStatus: registration.paymentStatus,
      },
      after: {
        deletedAt: deletedAt.toISOString(),
        deletedByAdminId: adminUser.id,
        deleteReason: reason,
      },
      reason,
      ipAddress,
    },
  });

  revalidatePath(`/admin/participants/${registrationId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/participants");
  redirect(`/admin/participants/${registrationId}?actionResult=archived`);
}

export async function restoreRegistration(registrationId: string) {
  const session = await requireAdminSession();
  const adminUser = await ensureAdminUser(session.email);
  const ipAddress = await getActionIpAddress();
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      deletedAt: true,
      deletedByAdminId: true,
      deleteReason: true,
    },
  });

  if (!registration) {
    redirect(`/admin/participants/${registrationId}?actionResult=not_found`);
  }

  if (!registration.deletedAt) {
    redirect(`/admin/participants/${registrationId}?actionResult=not_archived`);
  }

  await prisma.registration.update({
    where: { id: registration.id },
    data: {
      deletedAt: null,
      deletedByAdminId: null,
      deleteReason: null,
    },
  });

  await prisma.auditLog.create({
    data: {
      adminUserId: adminUser.id,
      registrationId: registration.id,
      action: "RESTORED",
      before: {
        deletedAt: registration.deletedAt.toISOString(),
        deletedByAdminId: registration.deletedByAdminId,
        deleteReason: registration.deleteReason,
      },
      after: {
        deletedAt: null,
        deletedByAdminId: null,
        deleteReason: null,
      },
      reason: "Archived registration restored from participant detail page.",
      ipAddress,
    },
  });

  revalidatePath(`/admin/participants/${registrationId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/participants");
  redirect(`/admin/participants/${registrationId}?actionResult=restored`);
}

async function ensureAdminUser(email: string) {
  return prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: email,
      role: "OWNER",
    },
    select: {
      id: true,
    },
  });
}

async function getActionIpAddress() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp?.trim();

  return ip || null;
}
