import { getMobileApplication } from "@/lib/event-applications";
import { authenticateMobileMember } from "@/lib/mobile-auth";
import {
  mobileApplicationsErrorResponse,
  mobileApplicationsJsonResponse,
} from "@/lib/mobile-applications-contract";

type MobileApplicationRouteContext = {
  params: Promise<{ applicationId: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: MobileApplicationRouteContext,
) {
  try {
    const { memberUser } = await authenticateMobileMember(request);
    const { applicationId } = await context.params;
    return mobileApplicationsJsonResponse(
      await getMobileApplication(memberUser.id, applicationId),
    );
  } catch (error) {
    return mobileApplicationsErrorResponse(error);
  }
}
