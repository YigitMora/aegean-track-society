import { listMobileApplications } from "@/lib/event-applications";
import { authenticateMobileMember } from "@/lib/mobile-auth";
import {
  mobileApplicationsErrorResponse,
  mobileApplicationsJsonResponse,
} from "@/lib/mobile-applications-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { memberUser } = await authenticateMobileMember(request);
    return mobileApplicationsJsonResponse(
      await listMobileApplications(memberUser.id),
    );
  } catch (error) {
    return mobileApplicationsErrorResponse(error);
  }
}
