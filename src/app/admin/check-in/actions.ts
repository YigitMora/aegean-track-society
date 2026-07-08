"use server";

import { redirect } from "next/navigation";
import {
  confirmRegistrationCheckIn,
  extractQrTokenFromInput,
  resultQueryForCheckInAction,
} from "@/lib/check-in";
import { requireAdminSession } from "@/lib/admin-auth";
import { getRequestIpAddress } from "@/lib/request-ip";

export async function lookupQrInput(formData: FormData) {
  await requireAdminSession();

  const input = String(formData.get("qrToken") ?? "");
  const token = extractQrTokenFromInput(input);

  if (!token) {
    redirect("/admin/check-in?result=invalid_token");
  }

  redirect(`/check-in/${encodeURIComponent(token)}`);
}

export async function confirmManualCheckIn(registrationId: string) {
  const session = await requireAdminSession();
  const result = await confirmRegistrationCheckIn({
    registrationId,
    adminEmail: session.email,
    ipAddress: await getRequestIpAddress(),
  });

  redirect(
    `/admin/check-in?registrationId=${encodeURIComponent(registrationId)}&result=${resultQueryForCheckInAction(
      result,
    )}`,
  );
}
