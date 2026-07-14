"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  completeCatalogMatchRequest,
  markCatalogMatchRequestInReview,
  recordCatalogMatchCompletionNotificationResult,
  rejectCatalogMatchRequest,
  updateCatalogMatchRequestAdminNote,
} from "@/lib/catalog-match-requests";
import { requireOwnerAdmin } from "@/lib/admin-authorization";
import { sendCatalogMatchCompletedMemberEmail } from "@/lib/email";

const catalogRequestsPath = "/admin/catalog-requests";

export async function markCatalogRequestInReviewAction(
  requestId: string,
  formData: FormData,
) {
  const owner = await requireOwnerAdmin();
  const result = await markCatalogMatchRequestInReview({
    requestId,
    adminUserId: owner.id,
    adminNote: normalizeNote(formData.get("adminNote")),
    ipAddress: await getActionIpAddress(),
  });

  revalidateCatalogRequests(requestId);
  redirect(catalogRequestResultPath(requestId, result.ok ? "in_review" : result.code));
}

export async function rejectCatalogRequestAction(
  requestId: string,
  formData: FormData,
) {
  const owner = await requireOwnerAdmin();
  const result = await rejectCatalogMatchRequest({
    requestId,
    adminUserId: owner.id,
    adminNote: normalizeNote(formData.get("adminNote")),
    ipAddress: await getActionIpAddress(),
  });

  revalidateCatalogRequests(requestId);
  redirect(catalogRequestResultPath(requestId, result.ok ? "rejected" : result.code));
}

export async function updateCatalogRequestAdminNoteAction(
  requestId: string,
  formData: FormData,
) {
  const owner = await requireOwnerAdmin();
  const result = await updateCatalogMatchRequestAdminNote({
    requestId,
    adminUserId: owner.id,
    adminNote: normalizeNote(formData.get("adminNote")),
    ipAddress: await getActionIpAddress(),
  });

  revalidateCatalogRequests(requestId);
  redirect(catalogRequestResultPath(requestId, result.ok ? "note_updated" : result.code));
}

export async function completeCatalogRequestAction(
  requestId: string,
  formData: FormData,
) {
  const owner = await requireOwnerAdmin();
  const ipAddress = await getActionIpAddress();
  const result = await completeCatalogMatchRequest({
    requestId,
    adminUserId: owner.id,
    adminNote: normalizeNote(formData.get("adminNote")),
    ipAddress,
  });

  if (!result.ok) {
    revalidateCatalogRequests(requestId);
    redirect(catalogRequestResultPath(requestId, result.code));
  }

  if (result.completed && result.notification) {
    const emailResult = await sendCatalogMatchCompletedMemberEmail({
      to: result.notification.memberEmail,
      memberDisplayName: result.notification.memberDisplayName,
      vehicleId: result.notification.vehicleId,
      vehicleBrand: result.notification.vehicleBrand,
      vehicleModel: result.notification.vehicleModel,
      vehicleYear: result.notification.vehicleYear,
      plateNumber: result.notification.plateNumber,
    });

    await recordCatalogMatchCompletionNotificationResult({
      requestId: result.requestId,
      sent: emailResult.status === "sent",
      ipAddress,
    });
  }

  revalidateCatalogRequests(requestId);
  redirect(
    catalogRequestResultPath(
      requestId,
      result.completed ? "completed" : "completed_noop",
    ),
  );
}

function revalidateCatalogRequests(requestId: string) {
  revalidatePath(catalogRequestsPath);
  revalidatePath(`${catalogRequestsPath}/${requestId}`);
  revalidatePath("/account");
  revalidatePath("/account/garage");
}

function catalogRequestResultPath(requestId: string, result: string) {
  const url = new URL(`${catalogRequestsPath}/${requestId}`, "https://ats.local");
  url.searchParams.set("catalogRequestResult", result);

  return `${url.pathname}${url.search}`;
}

function normalizeNote(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized ? normalized.slice(0, 1000) : null;
}

async function getActionIpAddress() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp?.trim();

  return ip || null;
}
