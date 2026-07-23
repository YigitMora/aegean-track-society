import { mutateMobileGarageVehicles } from "@/lib/mobile-garage";
import {
  authenticateMobileGarageMember,
  mobileGarageErrorResponse,
  mobileGarageJsonResponse,
  MobileGarageError,
} from "@/lib/mobile-garage-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { accessToken, memberUser } =
      await authenticateMobileGarageMember(request);
    const body = await readRequestBody(request);
    const responseBody = await mutateMobileGarageVehicles({
      memberUserId: memberUser.id,
      accessToken,
      body,
    });

    return mobileGarageJsonResponse(responseBody);
  } catch (error) {
    return mobileGarageErrorResponse(error);
  }
}

async function readRequestBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new MobileGarageError("MOBILE_GARAGE_INVALID_BODY");
  }
}
