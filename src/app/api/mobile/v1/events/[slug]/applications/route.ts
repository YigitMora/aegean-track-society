import {
  sendAdminNewRegistrationEmail,
  sendRegistrationReceivedEmail,
} from "@/lib/email";
import { after } from "next/server";
import {
  createMemberEventApplication,
  parseMobileApplicationInput,
} from "@/lib/event-applications";
import { authenticateMobileMember } from "@/lib/mobile-auth";
import {
  mobileApplicationsErrorResponse,
  mobileApplicationsJsonResponse,
  MobileApplicationsError,
} from "@/lib/mobile-applications-contract";
import { consumeRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { getClientIpFromRequest } from "@/lib/request-ip";

type MobileEventApplicationsRouteContext = {
  params: Promise<{ slug: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: MobileEventApplicationsRouteContext,
) {
  try {
    const { memberUser } = await authenticateMobileMember(request);
    const limit = consumeRateLimit({
      key: `mobile-application:${memberUser.id}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (limit.limited) {
      return mobileApplicationsJsonResponse(
        {
          error: {
            code: "MOBILE_APPLICATIONS_RATE_LIMITED",
            message: "Çok fazla başvuru denemesi yapıldı. Lütfen kısa süre sonra tekrar deneyin.",
          },
        },
        { status: 429, headers: getRateLimitHeaders(limit) },
      );
    }

    const body = await readRequestBody(request);
    const input = parseMobileApplicationInput(body);
    if (!input) {
      throw new MobileApplicationsError("MOBILE_APPLICATIONS_INVALID_BODY");
    }

    const { slug } = await context.params;
    const clientIp = getClientIpFromRequest(request);
    const result = await createMemberEventApplication({
      memberUser,
      slug,
      input,
      consentIpAddress: clientIp,
      source: "mobile_application",
    });

    after(async () => {
      await Promise.allSettled([
        sendRegistrationReceivedEmail({
          registrationId: result.email.registrationId,
          to: result.email.to,
          fullName: result.email.fullName,
          carBrandModel: result.email.carBrandModel,
          plateNumber: result.email.plateNumber,
        }),
        sendAdminNewRegistrationEmail({
          registrationId: result.email.registrationId,
          to: result.email.to,
          fullName: result.email.fullName,
          email: result.email.to,
          phone: result.email.phone,
          carBrandModel: result.email.carBrandModel,
          plateNumber: result.email.plateNumber,
          experienceLevel: result.email.experienceLevel,
          emergencyContactName: result.email.emergencyContactName,
          emergencyContactPhone: result.email.emergencyContactPhone,
        }),
      ]);
    });

    return mobileApplicationsJsonResponse(
      { data: { application: result.application } },
      { status: 201 },
    );
  } catch (error) {
    return mobileApplicationsErrorResponse(error);
  }
}

async function readRequestBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new MobileApplicationsError("MOBILE_APPLICATIONS_INVALID_BODY");
  }
}
