import {
  authenticateMobileMember,
  mobileJsonResponse,
} from "@/lib/mobile-auth";
import { permanentlyDeleteMobileGarageVehicle } from "@/lib/mobile-garage";
import {
  mobileGarageErrorResponse,
  MobileGarageError,
} from "@/lib/mobile-garage-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ vehicleId: string }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { accessToken, memberUser } = await authenticateMobileMember(request);
    const vehicleId = await readVehicleId(context);
    const requestBody = await readRequestBody(request);
    const body = await permanentlyDeleteMobileGarageVehicle({
      memberUserId: memberUser.id,
      vehicleId,
      accessToken,
      body: requestBody,
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

async function readRequestBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new MobileGarageError(
      "MOBILE_GARAGE_DELETE_CONFIRMATION_REQUIRED",
    );
  }
}
