import {
  authenticateMobileMember,
  mobileAuthErrorResponse,
  mobileJsonResponse,
} from "@/lib/mobile-auth";
import { isMemberProfileComplete } from "@/lib/member-profile-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { memberUser } = await authenticateMobileMember(request);

    return mobileJsonResponse({
      data: {
        member: {
          id: memberUser.id,
          email: memberUser.email,
          profileComplete: isMemberProfileComplete(memberUser),
          requiredConsentsComplete: Boolean(
            memberUser.memberKvkkAcceptedAt && memberUser.memberTermsAcceptedAt,
          ),
          marketingConsent: Boolean(
            memberUser.memberMarketingConsentAt &&
              !memberUser.memberMarketingConsentRevokedAt,
          ),
        },
        profile: {
          fullName: memberUser.profile?.fullName ?? null,
          displayName: memberUser.profile?.displayName ?? null,
          phone: memberUser.profile?.phone ?? null,
        },
      },
    });
  } catch (error) {
    return mobileAuthErrorResponse(error);
  }
}
