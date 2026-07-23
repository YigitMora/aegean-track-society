import {
  authenticateMobileMember,
  mobileAuthErrorResponse,
  mobileAuthJsonResponse,
} from "@/lib/mobile-auth";
import { buildMobileMeResponseBody } from "@/lib/mobile-me";
import {
  mobileProfileErrorResponse,
  mobileProfileJsonResponse,
  MobileProfileError,
  parseMobileProfileUpdateBody,
} from "@/lib/mobile-profile-contract";
import { updateMemberProfile } from "@/lib/member-profile-service";
import { getRequestIpAddress } from "@/lib/request-ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { memberUser } = await authenticateMobileMember(request);

    return mobileAuthJsonResponse(buildMobileMeResponseBody(memberUser));
  } catch (error) {
    return mobileAuthErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { memberUser } = await authenticateMobileMember(request);
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      throw new MobileProfileError("MOBILE_PROFILE_INVALID_BODY");
    }

    const parsed = parseMobileProfileUpdateBody(requestBody, {
      requireMissingConsents: Boolean(
        !memberUser.memberKvkkAcceptedAt || !memberUser.memberTermsAcceptedAt,
      ),
    });
    if (!parsed) {
      throw new MobileProfileError("MOBILE_PROFILE_INVALID_BODY");
    }

    const updatedMember = await updateMemberProfile({
      memberUser,
      data: parsed.data,
      acceptedMissingConsents: parsed.acceptedMissingConsents,
      requestIpAddress: parsed.acceptedMissingConsents
        ? await getRequestIpAddress()
        : null,
    });

    return mobileProfileJsonResponse(
      buildMobileMeResponseBody(updatedMember),
    );
  } catch (error) {
    return mobileProfileErrorResponse(error);
  }
}
