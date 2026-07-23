import {
  buildMobileRatingDiscoveryResponseBody,
  mobileRatingDiscoveryErrorResponse,
  mobileRatingDiscoveryJsonResponse,
} from "@/lib/mobile-rating-discovery-contract";
import { getFocusRsRatingDiscoveryDemo } from "@/lib/rating-discovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const demo = await getFocusRsRatingDiscoveryDemo();
    return mobileRatingDiscoveryJsonResponse(
      buildMobileRatingDiscoveryResponseBody(demo),
    );
  } catch {
    return mobileRatingDiscoveryErrorResponse();
  }
}
