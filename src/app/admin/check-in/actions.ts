"use server";

import { redirect } from "next/navigation";
import {
  confirmRegistrationCheckIn,
  extractQrTokenFromInput,
  resultQueryForCheckInAction,
} from "@/lib/check-in";
import { requireCheckinOrOwner } from "@/lib/admin-authorization";
import { getRequestIpAddress } from "@/lib/request-ip";

export async function lookupQrInput(formData: FormData) {
  await requireCheckinOrOwner();

  const input = String(formData.get("qrToken") ?? "");
  const token = extractQrTokenFromInput(input);

  if (!token) {
    redirect("/admin/check-in?result=invalid_token");
  }

  redirect(`/check-in/${encodeURIComponent(token)}`);
}

export async function confirmManualCheckIn(registrationId: string) {
  const adminActor = await requireCheckinOrOwner();
  const result = await confirmRegistrationCheckIn({
    registrationId,
    adminUserId: adminActor.id,
    ipAddress: await getRequestIpAddress(),
  });

  redirect(
    `/admin/check-in?registrationId=${encodeURIComponent(registrationId)}&result=${resultQueryForCheckInAction(
      result,
    )}`,
  );
}
