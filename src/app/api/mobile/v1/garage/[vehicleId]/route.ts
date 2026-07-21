import { authenticateMobileMember } from "@/lib/mobile-auth";
import {
  mobileGarageDetailErrorResponse,
  mobileGarageDetailJsonResponse,
} from "@/lib/mobile-garage-detail-contract";
import {
  getMobileGarageVehicleDetailResponseBody,
  updateMobileGarageVehicle,
} from "@/lib/mobile-garage-detail";
import {
  readMobileGarageJsonBody,
  readMobileGarageRouteId,
  type MobileGarageRouteContext,
} from "@/lib/mobile-garage-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: MobileGarageRouteContext) {
  try {
    const { accessToken, memberUser } = await authenticateMobileMember(request);
    const vehicleId = await readMobileGarageRouteId(context, "vehicleId");
    const body = await getMobileGarageVehicleDetailResponseBody({
      memberUserId: memberUser.id,
      vehicleId,
      accessToken,
    });
    return mobileGarageDetailJsonResponse(body);
  } catch (error) {
    return mobileGarageDetailErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: MobileGarageRouteContext) {
  try {
    const { memberUser } = await authenticateMobileMember(request);
    const vehicleId = await readMobileGarageRouteId(context, "vehicleId");
    const requestBody = await readMobileGarageJsonBody(request);
    const body = await updateMobileGarageVehicle({
      memberUserId: memberUser.id,
      vehicleId,
      body: requestBody,
    });
    return mobileGarageDetailJsonResponse(body);
  } catch (error) {
    return mobileGarageDetailErrorResponse(error);
  }
}
