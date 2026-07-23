import type { MobileMemberUser } from "@/lib/mobile-auth";
import { isMemberProfileComplete } from "@/lib/member-profile-validation";
import { normalizeTurkishPhone } from "@/lib/registration-validation";

export function buildMobileMeResponseBody(memberUser: MobileMemberUser) {
  return {
    data: {
      member: {
        id: memberUser.id,
        email: memberUser.email,
      },
      profileComplete: isMemberProfileComplete(memberUser),
      requiredConsentsComplete: Boolean(
        memberUser.memberKvkkAcceptedAt && memberUser.memberTermsAcceptedAt,
      ),
      marketingConsent: Boolean(
        memberUser.memberMarketingConsentAt &&
          !memberUser.memberMarketingConsentRevokedAt,
      ),
      profile: {
        fullName: memberUser.profile?.fullName ?? null,
        displayName: memberUser.profile?.displayName ?? null,
        phone: memberUser.profile?.phone
          ? normalizeTurkishPhone(memberUser.profile.phone) || null
          : null,
      },
    },
  };
}
