import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { formatDecimal, initializeCheckoutForm } from "@/lib/iyzico";
import { getPaymentMode, manualReservationMessage } from "@/lib/payment-mode";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import {
  normalizeEmail,
  normalizePlateNumber,
  normalizeTurkishPhone,
  registrationSchema,
} from "@/lib/registration-validation";
import { getClientIpFromRequest } from "@/lib/request-ip";

const eventSlug = "kula-mytrack-2026";
const packageCode = "SEP20";

export async function POST(request: Request) {
  const clientIp = getClientIpFromRequest(request) ?? "unknown";
  const ipLimit = consumeRateLimit({
    key: `registration:ip:${clientIp}`,
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });

  if (ipLimit.limited) {
    return rateLimitResponse(ipLimit, "Too many registration attempts. Please try again shortly.");
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = registrationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Please check the registration form.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const input = parsed.data;
  const email = normalizeEmail(input.email);
  const plateNumber = normalizePlateNumber(input.plateNumber);
  const paymentMode = getPaymentMode();
  const identityLimit = consumeRateLimit({
    key: `registration:identity:${email}:${plateNumber}`,
    limit: 4,
    windowMs: 60 * 60 * 1000,
  });

  if (identityLimit.limited) {
    return rateLimitResponse(
      identityLimit,
      "Too many attempts for this email and plate. Please try again later.",
    );
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
        "Secure payment was requested too many times. Please try again shortly.",
      );
    }
  }

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
      { message: "Registration is not open for this event yet." },
      { status: 404 },
    );
  }

  if (paymentMode === "iyzico" && eventPackage.price.lte(0)) {
    return NextResponse.json(
      { message: "Payment amount is not configured for this event yet." },
      { status: 409 },
    );
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const duplicate = await tx.registration.findFirst({
          where: {
            eventId: event.id,
            packageId: eventPackage.id,
            email,
            plateNumber,
            status: {
              in: ["PENDING_PAYMENT", "CONFIRMED"],
            },
          },
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        });

        if (duplicate) {
          return {
            type: "duplicate" as const,
            duplicate,
          };
        }

        const reservedCount = await tx.registration.count({
          where: {
            eventId: event.id,
            packageId: eventPackage.id,
            status: {
              in: ["PENDING_PAYMENT", "CONFIRMED"],
            },
          },
        });

        if (eventPackage.capacity > 0 && reservedCount >= eventPackage.capacity) {
          return {
            type: "capacity" as const,
          };
        }

        const now = new Date();
        const consentIpAddress = clientIp === "unknown" ? null : clientIp;
        const registration = await tx.registration.create({
          data: {
            eventId: event.id,
            packageId: eventPackage.id,
            fullName: input.fullName.trim(),
            phone: normalizeTurkishPhone(input.phone),
            email,
            carBrandModel: input.carBrandModel.trim(),
            plateNumber,
            experienceLevel: input.experienceLevel,
            emergencyContactName: input.emergencyContactName.trim(),
            emergencyContactPhone: normalizeTurkishPhone(input.emergencyContactPhone),
            kvkkAcceptedAt: now,
            liabilityWaiverAcceptedAt: now,
            marketingConsentAt: input.marketingConsent ? now : null,
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
          },
        });

        const payment =
          paymentMode === "iyzico"
            ? await tx.payment.create({
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

        return {
          type: "created" as const,
          registration,
          payment,
          consentIpAddress,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (result.type === "duplicate") {
      return NextResponse.json(
        {
          message:
            "A registration for this email and plate already exists for Kula MyTrack.",
          registrationStatus: result.duplicate.status,
        },
        { status: 409 },
      );
    }

    if (result.type === "capacity") {
      return NextResponse.json(
        { message: "This event package is currently full." },
        { status: 409 },
      );
    }

    if (paymentMode === "manual") {
      return NextResponse.json(
        {
          message: manualReservationMessage,
          paymentMode,
          registration: {
            id: result.registration.id,
            status: result.registration.status,
            paymentStatus: result.registration.paymentStatus,
          },
        },
        { status: 201 },
      );
    }

    if (!result.payment) {
      return NextResponse.json(
        { message: "Secure payment could not be initialized. Please try again." },
        { status: 500 },
      );
    }

    let checkoutForm: Awaited<ReturnType<typeof initializeCheckoutForm>>;

    try {
      checkoutForm = await initializeCheckoutForm({
        conversationId: result.payment.conversationId,
        basketId: result.registration.id,
        amount: result.payment.amount,
        currency: result.payment.currency,
        buyer: {
          id: result.registration.id,
          fullName: result.registration.fullName,
          email: result.registration.email,
          phone: result.registration.phone,
          ipAddress: result.consentIpAddress,
        },
        basketItem: {
          id: eventPackage.id,
          name: eventPackage.name,
        },
      });
    } catch (error) {
      await markPaymentInitializationFailed(result.payment.id, result.registration.id, {
        status: "failure",
        errorMessage: error instanceof Error ? error.message : "Unknown iyzico error",
      });

      return NextResponse.json(
        { message: "Secure payment could not be initialized. Please try again." },
        { status: 502 },
      );
    }

    if (checkoutForm.status !== "success" || !checkoutForm.paymentPageUrl) {
      await markPaymentInitializationFailed(
        result.payment.id,
        result.registration.id,
        checkoutForm,
      );

      return NextResponse.json(
        { message: "Secure payment could not be initialized. Please try again." },
        { status: 502 },
      );
    }

    await prisma.payment.update({
      where: { id: result.payment.id },
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
          id: result.registration.id,
          status: result.registration.status,
          paymentStatus: result.registration.paymentStatus,
        },
        payment: {
          conversationId: result.payment.conversationId,
          amount: formatDecimal(result.payment.amount),
          currency: result.payment.currency,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration create failed", error);

    return NextResponse.json(
      { message: "Registration could not be completed. Please try again." },
      { status: 500 },
    );
  }
}

async function markPaymentInitializationFailed(
  paymentId: string,
  registrationId: string,
  rawInitializeResponse: Record<string, unknown>,
) {
  await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "FAILED",
        rawInitializeResponse: rawInitializeResponse as Prisma.InputJsonObject,
      },
    }),
    prisma.registration.update({
      where: { id: registrationId },
      data: {
        status: "CANCELLED",
        paymentStatus: "FAILED",
      },
    }),
  ]);
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
