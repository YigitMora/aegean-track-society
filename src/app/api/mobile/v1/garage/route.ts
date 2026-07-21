import {
  authenticateMobileMember,
  mobileJsonResponse,
} from "@/lib/mobile-auth";
import {
  mobileGarageErrorResponse,
  mobileGarageLifecycleContractHeader,
  mobileGarageLifecycleContractVersion,
  MobileGarageError,
} from "@/lib/mobile-garage-contract";
import {
  createMobileGarageVehicle,
  getMobileGarageResponseBody,
} from "@/lib/mobile-garage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { accessToken, memberUser } = await authenticateMobileMember(request);
    const body = await getMobileGarageResponseBody(memberUser.id, accessToken, {
      includeArchived:
        request.headers.get(mobileGarageLifecycleContractHeader) ===
        mobileGarageLifecycleContractVersion,
    });

    return mobileJsonResponse(body);
  } catch (error) {
    return mobileGarageErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { memberUser } = await authenticateMobileMember(request);
    const requestBody = await readRequestBody(request);
    const responseBody = await createMobileGarageVehicle({
      memberUserId: memberUser.id,
      body: requestBody,
    });

    return mobileJsonResponse(responseBody, { status: 201 });
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
