import {
  authenticateMobileMember,
} from "@/lib/mobile-auth";
import {
  mobileApplicationsErrorResponse,
  mobileApplicationsJsonResponse,
} from "@/lib/mobile-applications-contract";
import { listMobileEvents } from "@/lib/event-applications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { memberUser } = await authenticateMobileMember(request);
    return mobileApplicationsJsonResponse(await listMobileEvents(memberUser));
  } catch (error) {
    return mobileApplicationsErrorResponse(error);
  }
}
