import {
  authenticateMobileMember,
  mobileJsonResponse,
} from "@/lib/mobile-auth";
import { mobileGarageErrorResponse } from "@/lib/mobile-garage-contract";
import { getMobileVehicleDefinitionsResponseBody } from "@/lib/mobile-garage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await authenticateMobileMember(request);
    const body = await getMobileVehicleDefinitionsResponseBody();

    return mobileJsonResponse(body);
  } catch (error) {
    return mobileGarageErrorResponse(error);
  }
}
