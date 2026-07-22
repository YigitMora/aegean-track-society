import { authenticateMobileGarageMember } from "@/lib/mobile-garage-contract";
import { prepareMobileGarageVehicleImageUpload } from "@/lib/mobile-garage-detail";
import {
  mobileGarageDetailErrorResponse,
  mobileGarageDetailJsonResponse,
} from "@/lib/mobile-garage-detail-contract";
import {
  readMobileGarageJsonBody,
  readMobileGarageRouteId,
  type MobileGarageRouteContext,
} from "@/lib/mobile-garage-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: MobileGarageRouteContext) {
  try {
    const { accessToken, memberUser } = await authenticateMobileGarageMember(request);
    const vehicleId = await readMobileGarageRouteId(context, "vehicleId");
    const requestBody = await readMobileGarageJsonBody(request);
    const body = await prepareMobileGarageVehicleImageUpload({
      memberUserId: memberUser.id,
      vehicleId,
      accessToken,
      body: requestBody,
    });
    return mobileGarageDetailJsonResponse(body, { status: 201 });
  } catch (error) {
    return mobileGarageDetailErrorResponse(error);
  }
}
