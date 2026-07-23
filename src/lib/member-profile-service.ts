import { Prisma } from "@prisma/client";
import type { AtsMemberUser } from "@/lib/member-auth";
import type { MemberProfileInput } from "@/lib/member-profile-validation";
import { prisma } from "@/lib/prisma";

const memberUserInclude = Prisma.validator<Prisma.UserInclude>()({
  profile: true,
});

export async function updateMemberProfile({
  memberUser,
  data,
  acceptedMissingConsents,
  requestIpAddress,
  now = new Date(),
}: {
  memberUser: AtsMemberUser;
  data: MemberProfileInput;
  acceptedMissingConsents: boolean;
  requestIpAddress: string | null;
  now?: Date;
}) {
  const requiresConsents =
    !memberUser.memberKvkkAcceptedAt || !memberUser.memberTermsAcceptedAt;

  return prisma.$transaction(async (tx) => {
    await tx.memberProfile.upsert({
      where: {
        userId: memberUser.id,
      },
      update: {
        fullName: data.fullName,
        phone: data.phone,
        displayName: data.displayName,
        profileCompletedAt: now,
      },
      create: {
        userId: memberUser.id,
        fullName: data.fullName,
        phone: data.phone,
        displayName: data.displayName,
        profileCompletedAt: now,
      },
    });

    await tx.user.update({
      where: {
        id: memberUser.id,
      },
      data: {
        ...(requiresConsents && acceptedMissingConsents
          ? {
              memberKvkkAcceptedAt: memberUser.memberKvkkAcceptedAt ?? now,
              memberTermsAcceptedAt: memberUser.memberTermsAcceptedAt ?? now,
              memberConsentIpAddress:
                memberUser.memberConsentIpAddress ?? requestIpAddress,
            }
          : {}),
        ...marketingConsentUpdate({
          wantsMarketingConsent: data.memberMarketingConsent,
          now,
        }),
      },
    });

    const updatedMember = await tx.user.findUnique({
      where: {
        id: memberUser.id,
      },
      include: memberUserInclude,
    });

    if (!updatedMember) {
      throw new Error("Updated member profile could not be loaded.");
    }

    return updatedMember;
  });
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
