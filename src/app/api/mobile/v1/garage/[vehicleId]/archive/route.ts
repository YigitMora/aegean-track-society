import {
  authenticateMobileMember,
  mobileJsonResponse,
} from "@/lib/mobile-auth";
import { archiveMobileGarageVehicle } from "@/lib/mobile-garage";
import {
  mobileGarageErrorResponse,
  MobileGarageError,
} from "@/lib/mobile-garage-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ vehicleId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { accessToken, memberUser } = await authenticateMobileMember(request);
    const vehicleId = await readVehicleId(context);
    const body = await archiveMobileGarageVehicle({
      memberUserId: memberUser.id,
      vehicleId,
      accessToken,
    });

    return mobileJsonResponse(body);
  } catch (error) {
    return mobileGarageErrorResponse(error);
  }
}

async function readVehicleId(context: RouteContext) {
  const { vehicleId } = await context.params;
  const normalizedVehicleId = vehicleId.trim();

  if (!normalizedVehicleId || normalizedVehicleId.length > 128) {
    throw new MobileGarageError("MOBILE_GARAGE_VEHICLE_NOT_FOUND");
  }

  return normalizedVehicleId;
}
