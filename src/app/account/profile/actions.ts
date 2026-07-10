"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMemberUser, normalizeMemberReturnTo } from "@/lib/member-auth";
import { parseMemberProfileForm } from "@/lib/member-profile-validation";
import { prisma } from "@/lib/prisma";
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

  const now = new Date();
  const ipAddress = await getRequestIpAddress();

  await prisma.$transaction(async (tx) => {
    await tx.memberProfile.upsert({
      where: {
        userId: memberUser.id,
      },
      update: {
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        displayName: parsed.data.displayName,
        profileCompletedAt: now,
      },
      create: {
        userId: memberUser.id,
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        displayName: parsed.data.displayName,
        profileCompletedAt: now,
      },
    });

    await tx.user.update({
      where: {
        id: memberUser.id,
      },
      data: {
        ...(requiresConsents && parsed.acceptedMissingConsents
          ? {
              memberKvkkAcceptedAt: memberUser.memberKvkkAcceptedAt ?? now,
              memberTermsAcceptedAt: memberUser.memberTermsAcceptedAt ?? now,
              memberConsentIpAddress: memberUser.memberConsentIpAddress ?? ipAddress,
            }
          : {}),
        ...marketingConsentUpdate({
          wantsMarketingConsent: parsed.data.memberMarketingConsent,
          now,
        }),
      },
    });
  });

  console.log("AUTH_PROFILE_UPDATED", {
    userId: memberUser.id,
    completed: true,
  });

  revalidatePath("/account");
  revalidatePath("/account/profile");
  revalidatePath("/account/onboarding");

  redirect(returnTo === "/account/onboarding" ? "/account?profile=updated" : `${returnTo}?profile=updated`);
}

function marketingConsentUpdate({
  wantsMarketingConsent,
  now,
}: {
  wantsMarketingConsent: boolean;
  now: Date;
}) {
  if (wantsMarketingConsent) {
    return {
      memberMarketingConsentAt: now,
      memberMarketingConsentRevokedAt: null,
    };
  }

  return {
    memberMarketingConsentRevokedAt: now,
  };
}
