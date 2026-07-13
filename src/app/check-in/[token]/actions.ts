"use server";

import { redirect } from "next/navigation";
import {
  confirmRegistrationCheckIn,
  lookupRegistrationByQrToken,
  resultQueryForCheckInAction,
} from "@/lib/check-in";
import { requireCheckinOrOwner } from "@/lib/admin-authorization";
import { getRequestIpAddress } from "@/lib/request-ip";

export async function confirmQrCheckIn(rawToken: string) {
  const returnPath = `/check-in/${encodeURIComponent(rawToken)}`;
  const adminActor = await requireCheckinOrOwner(returnPath);
  const lookup = await lookupRegistrationByQrToken(rawToken);

  if (lookup.type !== "found") {
    redirect(`${returnPath}?result=${lookup.reason}`);
  }

  const result = await confirmRegistrationCheckIn({
    registrationId: lookup.registration.id,
    adminUserId: adminActor.id,
    ipAddress: await getRequestIpAddress(),
  });

  redirect(`${returnPath}?result=${resultQueryForCheckInAction(result)}`);
}
