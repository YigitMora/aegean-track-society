"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMemberUser, normalizeMemberReturnTo } from "@/lib/member-auth";
import { parseMemberProfileForm } from "@/lib/member-profile-validation";
import { updateMemberProfile } from "@/lib/member-profile-service";
import { getRequestIpAddress } from "@/lib/request-ip";

export async function updateMemberProfileAction(formData: FormData) {
  const returnTo = normalizeMemberReturnTo(formData.get("returnTo"));
  const memberUser = await requireMemberUser(returnTo);
  const requiresConsents = !memberUser.memberKvkkAcceptedAt || !memberUser.memberTermsAcceptedAt;
  const parsed = parseMemberProfileForm(formData, {
    requireMissingConsents: requiresConsents,
  });

  if (!parsed.ok) {
    redirect(`${returnTo}?profileError=invalid`);
  }

  await updateMemberProfile({
    memberUser,
    data: parsed.data,
    acceptedMissingConsents: parsed.acceptedMissingConsents,
    requestIpAddress: await getRequestIpAddress(),
  });

  revalidatePath("/account");
  revalidatePath("/account/profile");
  revalidatePath("/account/onboarding");

  redirect(returnTo === "/account/onboarding" ? "/account?profile=updated" : `${returnTo}?profile=updated`);
}
