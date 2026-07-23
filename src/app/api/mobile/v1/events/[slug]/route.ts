import { authenticateMobileMember } from "@/lib/mobile-auth";
import {
  mobileApplicationsContractHeader,
  mobileApplicationsContractVersion,
  mobileApplicationsJsonResponse,
} from "@/lib/mobile-applications-contract";
import {
  mobileEventDiscoveryContractHeader,
  mobileEventDiscoveryContractVersion,
  mobileEventDiscoveryErrorResponse,
  mobileEventDiscoveryJsonResponse,
} from "@/lib/mobile-event-discovery-contract";
import { getMobileEventDiscovery } from "@/lib/mobile-event-discovery";
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
    const event = await getMobileEvent(memberUser, slug);
    if (
      request.headers.get(mobileEventDiscoveryContractHeader) ===
      mobileEventDiscoveryContractVersion
    ) {
      return mobileEventDiscoveryJsonResponse(
        {
          data: {
            event: {
              ...event.data.event,
              ...getMobileEventDiscovery(slug).data,
            },
          },
        },
        {
          headers: {
            [mobileApplicationsContractHeader]:
              mobileApplicationsContractVersion,
          },
        },
      );
    }
    return mobileApplicationsJsonResponse(event);
  } catch (error) {
    return mobileEventDiscoveryErrorResponse(error);
  }
}
