import { authenticateMobileMember } from "@/lib/mobile-auth";
import {
  mobileApplicationsErrorResponse,
  mobileApplicationsJsonResponse,
} from "@/lib/mobile-applications-contract";
import { getMobileEvent } from "@/lib/event-applications";

type MobileEventRouteContext = {
  params: Promise<{ slug: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: MobileEventRouteContext) {
  try {
    const { memberUser } = await authenticateMobileMember(request);
    const { slug } = await context.params;
    return mobileApplicationsJsonResponse(
      await getMobileEvent(memberUser, slug),
    );
  } catch (error) {
    return mobileApplicationsErrorResponse(error);
  }
}
