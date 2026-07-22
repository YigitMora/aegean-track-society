import { getMobileParticipantPass } from "@/lib/event-applications";
import { authenticateMobileMember } from "@/lib/mobile-auth";
import {
  mobileApplicationsErrorResponse,
  mobileApplicationsJsonResponse,
} from "@/lib/mobile-applications-contract";

type MobileApplicationPassRouteContext = {
  params: Promise<{ applicationId: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: MobileApplicationPassRouteContext,
) {
  try {
    const { memberUser } = await authenticateMobileMember(request);
    const { applicationId } = await context.params;
    return mobileApplicationsJsonResponse(
      await getMobileParticipantPass(memberUser.id, applicationId),
    );
  } catch (error) {
    return mobileApplicationsErrorResponse(error);
  }
}
