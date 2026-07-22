import {
  authenticateMobileGarageMember,
  mobileGarageErrorResponse,
  mobileGarageJsonResponse,
} from "@/lib/mobile-garage-contract";
import { getMobileVehicleDefinitionsResponseBody } from "@/lib/mobile-garage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await authenticateMobileGarageMember(request);
    const body = await getMobileVehicleDefinitionsResponseBody();

    return mobileGarageJsonResponse(body);
  } catch (error) {
    return mobileGarageErrorResponse(error);
  }
}
