"use server";

import { redirect } from "next/navigation";
import {
  confirmRegistrationCheckIn,
  lookupRegistrationByQrToken,
  resultQueryForCheckInAction,
} from "@/lib/check-in";
import { requireAdminSessionWithReturn } from "@/lib/admin-auth";
import { getRequestIpAddress } from "@/lib/request-ip";

export async function confirmQrCheckIn(rawToken: string) {
  const returnPath = `/check-in/${encodeURIComponent(rawToken)}`;
  const session = await requireAdminSessionWithReturn(returnPath);
  const lookup = await lookupRegistrationByQrToken(rawToken);

  if (lookup.type !== "found") {
    redirect(`${returnPath}?result=${lookup.reason}`);
  }

  const result = await confirmRegistrationCheckIn({
    registrationId: lookup.registration.id,
    adminEmail: session.email,
    ipAddress: await getRequestIpAddress(),
  });

  redirect(`${returnPath}?result=${resultQueryForCheckInAction(result)}`);
}
