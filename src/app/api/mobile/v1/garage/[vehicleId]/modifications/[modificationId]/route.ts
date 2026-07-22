import { authenticateMobileMember } from "@/lib/mobile-auth";
import { removeMobileGarageModification } from "@/lib/mobile-garage-detail";
import {
  mobileGarageDetailErrorResponse,
  mobileGarageDetailJsonResponse,
} from "@/lib/mobile-garage-detail-contract";
import {
  readMobileGarageRouteId,
  type MobileGarageRouteContext,
} from "@/lib/mobile-garage-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  context: MobileGarageRouteContext,
) {
  try {
    const { memberUser } = await authenticateMobileMember(request);
    const vehicleId = await readMobileGarageRouteId(context, "vehicleId");
    const modificationId = await readMobileGarageRouteId(
      context,
      "modificationId",
    );
    const body = await removeMobileGarageModification({
      memberUserId: memberUser.id,
      vehicleId,
      modificationId,
    });
    return mobileGarageDetailJsonResponse(body);
  } catch (error) {
    return mobileGarageDetailErrorResponse(error);
  }
}
