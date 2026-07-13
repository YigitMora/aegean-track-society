"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  archiveGarageVehicles,
  createGarageVehicle,
  makePrimaryGarageVehicle,
  matchGarageVehicleDefinition,
  permanentlyDeleteArchivedGarageVehicles,
  restoreGarageVehicle,
  updateGarageVehicle,
  type GarageActorContext,
  type GarageServiceErrorCode,
} from "@/lib/garage-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { vehicleImagesBucket } from "@/lib/vehicle-images";
import { parseVehicleForm } from "@/lib/vehicle-validation";

type AdminGarageActor = Extract<GarageActorContext, { type: "admin" }>;

export async function addMemberGarageVehicleAction(
  memberId: string,
  formData: FormData,
) {
  const actor = await requireGarageAdminActor(memberId);
  const parsed = parseVehicleForm(formData);

  if (!parsed.ok) {
    redirectWithGarageResult(memberId, "invalid");
  }

  const result = await createGarageVehicle({
    targetUserId: memberId,
    input: parsed.data,
    actor: withReason(actor, "Admin garage support vehicle create."),
  });

  if (!result.ok) {
    redirectWithGarageResult(memberId, result.code, result.blockingModifications);
  }

  revalidateAdminGarage(memberId);
  redirectWithGarageResult(memberId, "created");
}

export async function updateMemberGarageVehicleAction(
  memberId: string,
  vehicleId: string,
  formData: FormData,
) {
  const actor = await requireGarageAdminActor(memberId);
  const parsed = parseVehicleForm(formData);

  if (!parsed.ok) {
    redirectWithGarageResult(memberId, "invalid", undefined, vehicleId);
  }

  const result = await updateGarageVehicle({
    targetUserId: memberId,
    vehicleId,
    input: parsed.data,
    includeArchived: true,
    actor: withReason(actor, "Admin garage support vehicle update."),
  });

  if (!result.ok) {
    redirectWithGarageResult(
      memberId,
      result.code,
      result.blockingModifications,
      vehicleId,
    );
  }

  revalidateAdminGarage(memberId);
  redirectWithGarageResult(memberId, "updated", undefined, vehicleId);
}

export async function makePrimaryMemberGarageVehicleAction(
  memberId: string,
  vehicleId: string,
) {
  const actor = await requireGarageAdminActor(memberId);
  const result = await makePrimaryGarageVehicle({
    targetUserId: memberId,
    vehicleId,
    actor: withReason(actor, "Admin garage support primary vehicle change."),
  });

  if (!result.ok) {
    redirectWithGarageResult(memberId, result.code, undefined, vehicleId);
  }

  revalidateAdminGarage(memberId);
  redirectWithGarageResult(memberId, "primary", undefined, vehicleId);
}

export async function archiveMemberGarageVehicleAction(
  memberId: string,
  vehicleId: string,
  formData: FormData,
) {
  const actor = await requireGarageAdminActor(memberId);
  const result = await archiveGarageVehicles({
    targetUserId: memberId,
    vehicleIds: [vehicleId],
    actor: withReason(
      actor,
      normalizeReason(formData.get("reason")) ??
        "Admin garage support vehicle archive.",
    ),
  });

  if (!result.ok) {
    redirectWithGarageResult(memberId, result.code, undefined, vehicleId);
  }

  revalidateAdminGarage(memberId);
  redirectWithGarageResult(memberId, "archived", undefined, vehicleId);
}

export async function restoreMemberGarageVehicleAction(
  memberId: string,
  vehicleId: string,
) {
  const actor = await requireGarageAdminActor(memberId);
  const result = await restoreGarageVehicle({
    targetUserId: memberId,
    vehicleId,
    actor: withReason(actor, "Admin garage support vehicle restore."),
  });

  if (!result.ok) {
    redirectWithGarageResult(memberId, result.code, undefined, vehicleId);
  }

  revalidateAdminGarage(memberId);
  redirectWithGarageResult(memberId, "restored", undefined, vehicleId);
}

export async function deleteArchivedMemberGarageVehicleAction(
  memberId: string,
  vehicleId: string,
  formData: FormData,
) {
  const actor = await requireGarageAdminActor(memberId);
  const reason = normalizeReason(formData.get("reason"));
  const confirmation = normalizeConfirmation(formData.get("confirmVehicle"));

  if (!reason || !confirmation) {
    redirectWithGarageResult(memberId, "confirmation_required", undefined, vehicleId);
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: vehicleId,
      userId: memberId,
    },
    select: {
      id: true,
      brand: true,
      model: true,
      plateNumber: true,
      deletedAt: true,
    },
  });

  if (!vehicle) {
    redirectWithGarageResult(memberId, "not_found", undefined, vehicleId);
  }

  if (!vehicle.deletedAt) {
    redirectWithGarageResult(memberId, "active_delete_forbidden", undefined, vehicleId);
  }

  if (confirmation !== normalizeConfirmation(vehicle.plateNumber)) {
    redirectWithGarageResult(memberId, "confirmation_required", undefined, vehicleId);
  }

  const result = await permanentlyDeleteArchivedGarageVehicles({
    targetUserId: memberId,
    vehicleIds: [vehicleId],
    actor: withReason(
      actor,
      `Admin permanent garage vehicle deletion: ${reason}`,
    ),
  });

  if (!result.ok) {
    redirectWithGarageResult(memberId, result.code, undefined, vehicleId);
  }

  await deleteVehicleImageObjects(result.imagePaths, memberId);
  revalidateAdminGarage(memberId);
  redirectWithGarageResult(memberId, "deleted");
}

export async function matchMemberGarageVehicleDefinitionAction(
  memberId: string,
  vehicleId: string,
  formData: FormData,
) {
  const actor = await requireGarageAdminActor(memberId);
  const vehicleDefinitionId = normalizeText(formData.get("vehicleDefinitionId"));

  if (!vehicleDefinitionId) {
    redirectWithGarageResult(memberId, "invalid", undefined, vehicleId);
  }

  const result = await matchGarageVehicleDefinition({
    targetUserId: memberId,
    vehicleId,
    vehicleDefinitionId,
    normalizeIdentity: formData.get("normalizeIdentity") === "on",
    actor: withReason(actor, "Admin garage support catalog match."),
  });

  if (!result.ok) {
    redirectWithGarageResult(
      memberId,
      result.code,
      result.blockingModifications,
      vehicleId,
    );
  }

  revalidateAdminGarage(memberId);
  redirectWithGarageResult(memberId, "matched", undefined, vehicleId);
}

async function requireGarageAdminActor(memberId: string): Promise<AdminGarageActor> {
  const session = await requireAdminSession();
  const adminUser = await prisma.adminUser.upsert({
    where: {
      email: session.email,
    },
    update: {},
    create: {
      email: session.email,
      name: session.email,
      role: "OWNER",
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (adminUser.role === "CHECKIN") {
    redirectWithGarageResult(memberId, "admin_permission_denied");
  }

  return {
    type: "admin",
    adminUserId: adminUser.id,
    ipAddress: await getActionIpAddress(),
  };
}

function withReason(actor: AdminGarageActor, reason: string): AdminGarageActor {
  return {
    ...actor,
    reason,
  };
}

function redirectWithGarageResult(
  memberId: string,
  code: GarageServiceErrorCode | "created" | "updated" | "archived" | "restored" | "deleted" | "matched" | "primary",
  blockingModifications?: string[],
  vehicleId?: string,
): never {
  const url = new URL(`/admin/members/${memberId}`, "https://ats.local");
  url.searchParams.set("garageResult", code);

  if (vehicleId) {
    url.searchParams.set("vehicle", vehicleId);
  }

  if (blockingModifications?.length) {
    url.searchParams.set("blocked", blockingModifications.join(", "));
  }

  redirect(`${url.pathname}${url.search}`);
}

function revalidateAdminGarage(memberId: string) {
  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/admin/members");
  revalidatePath("/account/garage");
}

function normalizeText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized || null;
}

function normalizeReason(value: FormDataEntryValue | null) {
  const normalized = normalizeText(value);

  if (!normalized || normalized.length < 4 || normalized.length > 500) {
    return null;
  }

  return normalized;
}

function normalizeConfirmation(value: FormDataEntryValue | null) {
  return normalizeText(value)?.toLocaleUpperCase("tr-TR") ?? null;
}

async function getActionIpAddress() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp?.trim();

  return ip || null;
}

async function deleteVehicleImageObjects(imagePaths: string[], memberId: string) {
  const uniqueImagePaths = Array.from(new Set(imagePaths.filter(Boolean)));

  if (uniqueImagePaths.length === 0) {
    return;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.storage
      .from(vehicleImagesBucket)
      .remove(uniqueImagePaths);

    if (error) {
      console.warn("ADMIN_GARAGE_VEHICLE_IMAGE_CLEANUP_FAILED", {
        memberId,
        imageObjectCount: uniqueImagePaths.length,
        errorCode: error.name,
      });
    }
  } catch (error) {
    console.warn("ADMIN_GARAGE_VEHICLE_IMAGE_CLEANUP_FAILED", {
      memberId,
      imageObjectCount: uniqueImagePaths.length,
      errorCode: error instanceof Error ? error.name : "unknown",
    });
  }
}
