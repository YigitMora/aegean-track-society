"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-auth";
import { confirmManualRegistrationPayment } from "@/lib/manual-payment-confirmation";
import { prisma } from "@/lib/prisma";

export async function updateAdminNotes(registrationId: string, formData: FormData) {
  const session = await requireAdminSession();
  const nextNotes = String(formData.get("adminNotes") ?? "").trim() || null;
  const previousRegistration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      adminNotes: true,
    },
  });

  if (!previousRegistration) {
    throw new Error("Registration not found.");
  }

  if ((previousRegistration.adminNotes ?? null) === nextNotes) {
    revalidatePath(`/admin/participants/${registrationId}`);
    return;
  }

  const adminUser = await prisma.adminUser.upsert({
    where: { email: session.email },
    update: {},
    create: {
      email: session.email,
      name: session.email,
      role: "OWNER",
    },
    select: {
      id: true,
    },
  });
  const ipAddress = await getActionIpAddress();

  await prisma.$transaction([
    prisma.registration.update({
      where: { id: registrationId },
      data: {
        adminNotes: nextNotes,
      },
    }),
    prisma.auditLog.create({
      data: {
        adminUserId: adminUser.id,
        registrationId,
        action: "ADMIN_NOTES_UPDATED",
        before: {
          adminNotes: previousRegistration.adminNotes,
        },
        after: {
          adminNotes: nextNotes,
        },
        reason: "Admin note updated from participant detail page.",
        ipAddress,
      },
    }),
  ]);

  revalidatePath(`/admin/participants/${registrationId}`);
}

export async function confirmManualPayment(registrationId: string) {
  const session = await requireAdminSession();
  const result = await confirmManualRegistrationPayment({
    registrationId,
    adminEmail: session.email,
    ipAddress: await getActionIpAddress(),
  });

  revalidatePath(`/admin/participants/${registrationId}`);
  redirect(
    `/admin/participants/${registrationId}?paymentResult=${encodeURIComponent(result.status)}`,
  );
}

async function getActionIpAddress() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp?.trim();

  return ip || null;
}
