import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  sendAdminNewRegistrationEmail,
  sendRegistrationReceivedEmail,
} from "@/lib/email";
import { createMemberEventApplication } from "@/lib/event-applications";
import { formatDecimal, initializeCheckoutForm } from "@/lib/iyzico";
import { ensureMemberUser, getVerifiedSupabaseUser } from "@/lib/member-auth";
import { MobileAuthError } from "@/lib/mobile-auth";
import { isMemberProfileComplete } from "@/lib/member-profile-validation";
import { getPaymentMode, manualReservationMessage } from "@/lib/payment-mode";
import { MobileApplicationsError } from "@/lib/mobile-applications-contract";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import {
  memberEventRegistrationSchema,
  normalizeTurkishPhone,
} from "@/lib/registration-validation";
import { getClientIpFromRequest } from "@/lib/request-ip";

const eventSlug = "kula-mytrack-2026";
const packageCode = "SEP20";
const activeRegistrationStatuses = ["PENDING_PAYMENT", "CONFIRMED"] as const;

export async function POST(request: Request) {
  const clientIp = getClientIpFromRequest(request) ?? "unknown";
  const ipLimit = consumeRateLimit({
    key: `registration:ip:${clientIp}`,
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });

  if (ipLimit.limited) {
    return rateLimitResponse(ipLimit, "Çok fazla kayıt denemesi yapıldı. Lütfen kısa süre sonra tekrar deneyin.");
  }

  const supabaseUser = await getVerifiedSupabaseUser().catch(() => null);

  if (!supabaseUser) {
    return NextResponse.json(
      { message: "Etkinlik kaydı için giriş yapmanız gerekir." },
      { status: 401 },
    );
  }

  let memberUser: Awaited<ReturnType<typeof ensureMemberUser>>;

  try {
    memberUser = await ensureMemberUser(supabaseUser);
  } catch (error) {
    logMemberRegistrationFailure("unknown", "provision_member", error);

    return NextResponse.json(
      { message: "Üyelik hesabı doğrulanamadı. Lütfen tekrar giriş yapın." },
      { status: 403 },
    );
  }

  if (memberUser.status !== "ACTIVE" || memberUser.deletedAt) {
    return NextResponse.json(
      { message: "Üyelik hesabınız bu işlem için uygun değil." },
      { status: 403 },
    );
  }

  if (!isMemberProfileComplete(memberUser)) {
    return NextResponse.json(
      { message: "Etkinlik kaydı için üyelik profilinizi tamamlamanız gerekir." },
      { status: 403 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Form isteği geçerli değil." },
      { status: 400 },
    );
  }

  const parsed = memberEventRegistrationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Lütfen kayıt formundaki bilgileri kontrol edin.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const input = parsed.data;
  const profile = memberUser.profile;

  if (!profile?.fullName || !profile.phone) {
    return NextResponse.json(
      { message: "Etkinlik kaydı için üyelik profilinizi tamamlamanız gerekir." },
      { status: 403 },
    );
  }

  const paymentMode = getPaymentMode();

  if (paymentMode === "manual") {
    try {
      const result = await createMemberEventApplication({
        memberUser,
        slug: eventSlug,
        input,
        consentIpAddress: clientIp === "unknown" ? null : clientIp,
        source: "member_registration_form",
      });

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

      return NextResponse.json(
        {
          message: manualReservationMessage,
          paymentMode,
          successUrl: `/registration/success?registrationId=${result.application.id}`,
          registration: {
            id: result.application.id,
            status: "PENDING_PAYMENT",
            paymentStatus: "UNPAID",
          },
        },
        { status: 201 },
      );
    } catch (error) {
      return legacyManualRegistrationErrorResponse(error);
    }
  }

  if (paymentMode === "iyzico") {
    const paymentInitializationLimit = consumeRateLimit({
      key: `payment-init:ip:${clientIp}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    if (paymentInitializationLimit.limited) {
      return rateLimitResponse(
        paymentInitializationLimit,
        "Güvenli ödeme çok fazla kez istendi. Lütfen kısa süre sonra tekrar deneyin.",
      );
    }
  }

  try {
    const event = await prisma.event.findUnique({
      where: { slug: eventSlug },
      include: {
        packages: {
          where: {
            code: packageCode,
            active: true,
          },
          take: 1,
        },
      },
    });

    const eventPackage = event?.packages[0];

    if (!event || !eventPackage) {
      return NextResponse.json(
        { message: "Bu etkinlik için kayıt henüz açık değil." },
        { status: 404 },
      );
    }

    if (paymentMode === "iyzico" && eventPackage.price.lte(0)) {
      return NextResponse.json(
        { message: "Bu etkinlik için ödeme tutarı henüz tanımlanmadı." },
        { status: 409 },
      );
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: input.vehicleId,
        userId: memberUser.id,
        deletedAt: null,
      },
      select: {
        id: true,
        brand: true,
        model: true,
        plateNumber: true,
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        { message: "Seçilen araç bulunamadı veya bu üyelik hesabına ait değil." },
        { status: 422 },
      );
    }

    const memberDuplicate = await prisma.registration.findFirst({
      where: {
        eventId: event.id,
        packageId: eventPackage.id,
        userId: memberUser.id,
        deletedAt: null,
        status: {
          in: [...activeRegistrationStatuses],
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (memberDuplicate) {
      return NextResponse.json(
        {
          message: "Bu etkinlik paketi için aktif bir kayıt talebiniz zaten mevcut.",
          registrationStatus: memberDuplicate.status,
        },
        { status: 409 },
      );
    }

    const snapshotEmail = memberUser.email;
    const snapshotVehicle = `${vehicle.brand} ${vehicle.model}`.trim().replace(/\s+/g, " ");
    const snapshotPlate = vehicle.plateNumber;

    const compatibilityDuplicate = await prisma.registration.findFirst({
      where: {
        eventId: event.id,
        packageId: eventPackage.id,
        email: snapshotEmail,
        plateNumber: snapshotPlate,
        deletedAt: null,
        status: {
          in: [...activeRegistrationStatuses],
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (compatibilityDuplicate) {
      return NextResponse.json(
        {
          message: "Bu bilgilerle aktif bir kayıt zaten mevcut.",
          registrationStatus: compatibilityDuplicate.status,
        },
        { status: 409 },
      );
    }

    const reservedCount = await prisma.registration.count({
      where: {
        eventId: event.id,
        packageId: eventPackage.id,
        deletedAt: null,
        status: {
          in: [...activeRegistrationStatuses],
        },
      },
    });

    if (eventPackage.capacity > 0 && reservedCount >= eventPackage.capacity) {
      return NextResponse.json(
        { message: "Bu etkinlik paketi için kontenjan dolu." },
        { status: 409 },
      );
    }

    const now = new Date();
    const consentIpAddress = clientIp === "unknown" ? null : clientIp;
    const normalizedEmergencyPhone = normalizeTurkishPhone(input.emergencyContactPhone);
    const marketingConsentActive = Boolean(
      memberUser.memberMarketingConsentAt &&
        !memberUser.memberMarketingConsentRevokedAt,
    );

    const registration = await prisma.registration.create({
      data: {
        eventId: event.id,
        packageId: eventPackage.id,
        userId: memberUser.id,
        vehicleId: vehicle.id,
        registrationSource: "MEMBER_ACCOUNT",
        fullName: profile.fullName,
        phone: profile.phone,
        email: snapshotEmail,
        carBrandModel: snapshotVehicle,
        plateNumber: snapshotPlate,
        experienceLevel: input.experienceLevel,
        emergencyContactName: input.emergencyContactName.trim().replace(/\s+/g, " "),
        emergencyContactPhone: normalizedEmergencyPhone,
        kvkkAcceptedAt: now,
        liabilityWaiverAcceptedAt: now,
        marketingConsentAt: marketingConsentActive ? now : null,
        consentIpAddress,
        status: "PENDING_PAYMENT",
        paymentStatus: "UNPAID",
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        fullName: true,
        phone: true,
        email: true,
        carBrandModel: true,
        plateNumber: true,
        experienceLevel: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
      },
    });

    const payment =
      paymentMode === "iyzico"
        ? await prisma.payment.create({
            data: {
              registrationId: registration.id,
              provider: "IYZICO",
              conversationId: randomUUID(),
              amount: eventPackage.price,
              currency: eventPackage.currency,
              status: "INITIATED",
            },
            select: {
              id: true,
              conversationId: true,
              amount: true,
              currency: true,
            },
          })
        : null;

    await createRegistrationCreatedAuditLog(registration.id, consentIpAddress);
    await Promise.allSettled([
      sendRegistrationReceivedEmail({
        registrationId: registration.id,
        to: registration.email,
        fullName: registration.fullName,
        carBrandModel: registration.carBrandModel,
        plateNumber: registration.plateNumber,
      }),
      sendAdminNewRegistrationEmail({
        registrationId: registration.id,
        to: registration.email,
        fullName: registration.fullName,
        email: registration.email,
        phone: registration.phone,
        carBrandModel: registration.carBrandModel,
        plateNumber: registration.plateNumber,
        experienceLevel: registration.experienceLevel,
        emergencyContactName: registration.emergencyContactName,
        emergencyContactPhone: registration.emergencyContactPhone,
      }),
    ]);

    if (!payment) {
      return NextResponse.json(
        { message: "Güvenli ödeme başlatılamadı. Lütfen tekrar deneyin." },
        { status: 500 },
      );
    }

    let checkoutForm: Awaited<ReturnType<typeof initializeCheckoutForm>>;

    try {
      checkoutForm = await initializeCheckoutForm({
        conversationId: payment.conversationId,
        basketId: registration.id,
        amount: payment.amount,
        currency: payment.currency,
        buyer: {
          id: registration.id,
          fullName: registration.fullName,
          email: registration.email,
          phone: registration.phone,
          ipAddress: consentIpAddress,
        },
        basketItem: {
          id: eventPackage.id,
          name: eventPackage.name,
        },
      });
    } catch (error) {
      await markPaymentInitializationFailed(payment.id, registration.id, {
        status: "failure",
        errorMessage: error instanceof Error ? error.message : "Unknown iyzico error",
      });

      return NextResponse.json(
        { message: "Güvenli ödeme başlatılamadı. Lütfen tekrar deneyin." },
        { status: 502 },
      );
    }

    if (checkoutForm.status !== "success" || !checkoutForm.paymentPageUrl) {
      await markPaymentInitializationFailed(payment.id, registration.id, checkoutForm);

      return NextResponse.json(
        { message: "Güvenli ödeme başlatılamadı. Lütfen tekrar deneyin." },
        { status: 502 },
      );
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        iyzicoToken: checkoutForm.token,
        rawInitializeResponse: checkoutForm as Prisma.InputJsonObject,
      },
    });

    return NextResponse.json(
      {
        message: "Registration received. Redirecting to secure payment...",
        paymentPageUrl: checkoutForm.paymentPageUrl,
        registration: {
          id: registration.id,
          status: registration.status,
          paymentStatus: registration.paymentStatus,
        },
        payment: {
          conversationId: payment.conversationId,
          amount: formatDecimal(payment.amount),
          currency: payment.currency,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    logMemberRegistrationFailure(memberUser.id, "create", error, input.vehicleId);
    return registrationErrorResponse(error);
  }
}

function legacyManualRegistrationErrorResponse(error: unknown) {
  if (error instanceof MobileAuthError) {
    return NextResponse.json(
      { message: "Üyelik hesabınız bu işlem için uygun değil." },
      { status: error.status },
    );
  }

  if (error instanceof MobileApplicationsError) {
    const status = error.status === 404 ? 404 : error.status;
    return NextResponse.json({ message: error.message }, { status });
  }

  return registrationErrorResponse(error);
}

function registrationErrorResponse(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: duplicateMessageForUniqueError(error) },
        { status: 409 },
      );
    }

    if (error.code === "P2021" || error.code === "P2022") {
      return NextResponse.json(
        { message: "Kayıt veritabanı şu anda hazır değil. Lütfen etkinlik ekibiyle iletişime geçin." },
        { status: 503 },
      );
    }
  }

  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
  ) {
    return NextResponse.json(
      { message: "Kayıt veritabanına şu anda ulaşılamıyor. Lütfen kısa süre sonra tekrar deneyin." },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { message: "Kayıt şu anda tamamlanamadı. Lütfen tekrar deneyin." },
    { status: 500 },
  );
}

function duplicateMessageForUniqueError(error: Prisma.PrismaClientKnownRequestError) {
  const target = Array.isArray(error.meta?.target)
    ? error.meta.target.join(",")
    : String(error.meta?.target ?? "");

  if (
    target.includes("Registration_member_active_package_key") ||
    target.includes("userId")
  ) {
    return "Bu etkinlik paketi için aktif bir kayıt talebiniz zaten mevcut.";
  }

  return "Bu bilgilerle aktif bir kayıt zaten mevcut.";
}

async function createRegistrationCreatedAuditLog(
  registrationId: string,
  ipAddress: string | null,
) {
  try {
    await prisma.auditLog.create({
      data: {
        registrationId,
        action: "CREATED",
        after: {
          source: "member_registration_form",
          status: "PENDING_PAYMENT",
          paymentStatus: "UNPAID",
        },
        reason: "Registration created from member account registration form.",
        ipAddress,
      },
    });
  } catch (error) {
    logMemberRegistrationFailure("unknown", "audit_created", error, undefined, registrationId);
  }
}

async function markPaymentInitializationFailed(
  paymentId: string,
  registrationId: string,
  rawInitializeResponse: Record<string, unknown>,
) {
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: "FAILED",
      rawInitializeResponse: rawInitializeResponse as Prisma.InputJsonObject,
    },
  });

  await prisma.registration.update({
    where: { id: registrationId },
    data: {
      status: "CANCELLED",
      paymentStatus: "FAILED",
    },
  });
}

function logMemberRegistrationFailure(
  userId: string,
  operation: string,
  error: unknown,
  vehicleId?: string,
  registrationId?: string,
) {
  console.warn("MEMBER_REGISTRATION_FAILED", {
    userId,
    vehicleId,
    registrationId,
    operation,
    errorCode: safeErrorCode(error),
  });
}

function safeErrorCode(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code;
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return error.errorCode ?? error.name;
  }

  if (error instanceof Error) {
    return error.name;
  }

  return "UNKNOWN";
}

function rateLimitResponse(
  rateLimit: ReturnType<typeof consumeRateLimit>,
  message: string,
) {
  return NextResponse.json(
    { message },
    {
      status: 429,
      headers: getRateLimitHeaders(rateLimit),
    },
  );
}
