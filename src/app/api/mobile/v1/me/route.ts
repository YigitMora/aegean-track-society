import {
  authenticateMobileMember,
  mobileAuthErrorResponse,
  mobileAuthJsonResponse,
} from "@/lib/mobile-auth";
import { buildMobileMeResponseBody } from "@/lib/mobile-me";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { memberUser } = await authenticateMobileMember(request);

    return mobileAuthJsonResponse(buildMobileMeResponseBody(memberUser));
  } catch (error) {
    return mobileAuthErrorResponse(error);
  }
}
