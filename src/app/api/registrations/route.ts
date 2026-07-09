import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { formatDecimal, initializeCheckoutForm } from "@/lib/iyzico";
import {
  sendAdminNewRegistrationEmail,
  sendRegistrationReceivedEmail,
} from "@/lib/email";
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

type RegistrationApiDebugContext = {
  eventSlug: string;
  eventFound: boolean;
  packageFound: boolean;
  validationPassed: boolean;
  normalizedPhone: string | null;
  normalizedEmergencyPhone: string | null;
  vehicle: string | null;
  experience: string | null;
};

class RegistrationPrismaOperationError extends Error {
  constructor(
    readonly operation: string,
    readonly originalError: unknown,
  ) {
    super(`Prisma operation failed: ${operation}`);
    this.name = "RegistrationPrismaOperationError";
  }
}

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
    logRegistrationApiDebug(
      {
        eventSlug,
        eventFound: false,
        packageFound: false,
        validationPassed: false,
        normalizedPhone: null,
        normalizedEmergencyPhone: null,
        vehicle: null,
        experience: null,
      },
      "registrationSchema.safeParse",
    );

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
  const normalizedPhone = normalizeTurkishPhone(input.phone);
  const normalizedEmergencyPhone = normalizeTurkishPhone(input.emergencyContactPhone);
  const debugContext: RegistrationApiDebugContext = {
    eventSlug,
    eventFound: false,
    packageFound: false,
    validationPassed: true,
    normalizedPhone,
    normalizedEmergencyPhone,
    vehicle: input.carBrandModel.trim(),
    experience: input.experienceLevel,
  };
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

  try {
    const event = await withPrismaOperationDebug(debugContext, "event.findUnique", () =>
      prisma.event.findUnique({
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
      }),
    );

    const eventPackage = event?.packages[0];
    debugContext.eventFound = Boolean(event);
    debugContext.packageFound = Boolean(eventPackage);
    logRegistrationApiDebug(debugContext, "package.lookup.result");

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

    // Production uses the Supabase transaction pooler, so this public write path
    // avoids interactive transactions and keeps each database operation short.
    logRegistrationApiDebug(debugContext, "registration.writeFlow.start");

    const duplicate = await withPrismaOperationDebug(
      debugContext,
      "registration.findFirst.duplicateCheck",
      () =>
        prisma.registration.findFirst({
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
        }),
    );

    if (duplicate) {
      logRegistrationApiDebug(debugContext, "registration.writeFlow.duplicate");

      return NextResponse.json(
        {
          message:
            "A registration for this email and plate already exists for Kula MyTrack.",
          registrationStatus: duplicate.status,
        },
        { status: 409 },
      );
    }

    const reservedCount = await withPrismaOperationDebug(
      debugContext,
      "registration.count.capacityCheck",
      () =>
        prisma.registration.count({
          where: {
            eventId: event.id,
            packageId: eventPackage.id,
            status: {
              in: ["PENDING_PAYMENT", "CONFIRMED"],
            },
          },
        }),
    );

    if (eventPackage.capacity > 0 && reservedCount >= eventPackage.capacity) {
      logRegistrationApiDebug(debugContext, "registration.writeFlow.capacityFull");

      return NextResponse.json(
        { message: "This event package is currently full." },
        { status: 409 },
      );
    }

    const now = new Date();
    const consentIpAddress = clientIp === "unknown" ? null : clientIp;
    const registration = await withPrismaWriteDebug(
      debugContext,
      "registration.create",
      () =>
        prisma.registration.create({
          data: {
            eventId: event.id,
            packageId: eventPackage.id,
            fullName: input.fullName.trim(),
            phone: normalizedPhone,
            email,
            carBrandModel: input.carBrandModel.trim(),
            plateNumber,
            experienceLevel: input.experienceLevel,
            emergencyContactName: input.emergencyContactName.trim(),
            emergencyContactPhone: normalizedEmergencyPhone,
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
            carBrandModel: true,
            plateNumber: true,
            experienceLevel: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
          },
        }),
    );

    const payment =
      paymentMode === "iyzico"
        ? await withPrismaWriteDebug(debugContext, "payment.create", () =>
            prisma.payment.create({
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
            }),
          )
        : null;

    logRegistrationApiDebug(debugContext, "registration.writeFlow.success");
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

    if (paymentMode === "manual") {
      return NextResponse.json(
        {
          message: manualReservationMessage,
          paymentMode,
          successUrl: `/registration/success?registrationId=${registration.id}`,
          registration: {
            id: registration.id,
            status: registration.status,
            paymentStatus: registration.paymentStatus,
          },
        },
        { status: 201 },
      );
    }

    if (!payment) {
      return NextResponse.json(
        { message: "Secure payment could not be initialized. Please try again." },
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
      await markPaymentInitializationFailed(
        debugContext,
        payment.id,
        registration.id,
        {
          status: "failure",
          errorMessage: error instanceof Error ? error.message : "Unknown iyzico error",
        },
      );

      return NextResponse.json(
        { message: "Secure payment could not be initialized. Please try again." },
        { status: 502 },
      );
    }

    if (checkoutForm.status !== "success" || !checkoutForm.paymentPageUrl) {
      await markPaymentInitializationFailed(
        debugContext,
        payment.id,
        registration.id,
        checkoutForm,
      );

      return NextResponse.json(
        { message: "Secure payment could not be initialized. Please try again." },
        { status: 502 },
      );
    }

    await withPrismaWriteDebug(debugContext, "payment.update.checkoutInitialize", () =>
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          iyzicoToken: checkoutForm.token,
          rawInitializeResponse: checkoutForm as Prisma.InputJsonObject,
        },
      }),
    );

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
    return registrationErrorResponse(error);
  }
}

async function withPrismaOperationDebug<T>(
  debugContext: RegistrationApiDebugContext,
  operation: string,
  action: () => Promise<T>,
) {
  logRegistrationApiDebug(debugContext, `${operation}.start`, undefined, operation);

  try {
    const result = await action();
    logRegistrationApiDebug(debugContext, `${operation}.success`, undefined, operation);
    return result;
  } catch (error) {
    logRegistrationApiDebug(debugContext, `${operation}.error`, error, operation);
    throw new RegistrationPrismaOperationError(operation, error);
  }
}

async function withPrismaWriteDebug<T>(
  debugContext: RegistrationApiDebugContext,
  operation: string,
  action: () => Promise<T>,
) {
  return withPrismaOperationDebug(debugContext, operation, action);
}

function logRegistrationApiDebug(
  debugContext: RegistrationApiDebugContext,
  stage: string,
  error?: unknown,
  prismaOperation = stage,
) {
  const serializedError = error === undefined ? null : serializeRegistrationError(error);
  const payload = {
    stage,
    eventSlug: debugContext.eventSlug,
    eventFound: debugContext.eventFound,
    packageFound: debugContext.packageFound,
    validationPassed: debugContext.validationPassed,
    normalizedPhone: debugContext.normalizedPhone,
    normalizedEmergencyPhone: debugContext.normalizedEmergencyPhone,
    vehicle: debugContext.vehicle,
    experience: debugContext.experience,
    prismaOperation,
    prismaOperationCurrentlyExecuting: prismaOperation,
    prismaErrorCode: serializedError?.code ?? null,
    prismaErrorMessage: serializedError?.message ?? null,
    stackFirstThreeLines: serializedError?.stackFirstThreeLines ?? [],
  };

  if (error === undefined) {
    console.log("REGISTRATION_API_DEBUG", payload);
    return;
  }

  console.error("REGISTRATION_API_DEBUG", payload);
}

function registrationErrorResponse(error: unknown) {
  const { operation, originalError } = unwrapPrismaOperationError(error);
  const serializedError = serializeRegistrationError(originalError);

  console.error("REGISTRATION_SUBMIT_ERROR", {
    operation,
    ...serializedError,
  });

  if (originalError instanceof Prisma.PrismaClientKnownRequestError) {
    if (originalError.code === "P2021") {
      return registrationDatabaseErrorResponse(
        "Registration database table is missing.",
        503,
        operation,
        serializedError.code,
      );
    }

    if (originalError.code === "P2002") {
      return registrationDatabaseErrorResponse(
        "A registration for this information already exists. Please contact the event team if you need changes.",
        409,
        operation,
        serializedError.code,
      );
    }

    if (originalError.code === "P2003") {
      return registrationDatabaseErrorResponse(
        "Registration database relation check failed.",
        500,
        operation,
        serializedError.code,
      );
    }

    if (originalError.code === "P2022") {
      return registrationDatabaseErrorResponse(
        "Registration database column is missing.",
        503,
        operation,
        serializedError.code,
      );
    }

    if (originalError.code === "P2034") {
      return registrationDatabaseErrorResponse(
        "Registration database transaction conflict.",
        409,
        operation,
        serializedError.code,
      );
    }
  }

  if (
    originalError instanceof Prisma.PrismaClientInitializationError ||
    originalError instanceof Prisma.PrismaClientUnknownRequestError
  ) {
    if (serializedError.code === "P1000") {
      return registrationDatabaseErrorResponse(
        "Registration database authentication failed.",
        503,
        operation,
        serializedError.code,
      );
    }

    if (serializedError.code === "P1001") {
      return registrationDatabaseErrorResponse(
        "Registration database host could not be reached.",
        503,
        operation,
        serializedError.code,
      );
    }

    if (serializedError.code === "P1003") {
      return registrationDatabaseErrorResponse(
        "Registration database does not exist.",
        503,
        operation,
        serializedError.code,
      );
    }

    return registrationDatabaseErrorResponse(
      "Registration database connection failed.",
      503,
      operation,
      serializedError.code,
    );
  }

  return registrationDatabaseErrorResponse(
    "Registration database operation failed.",
    500,
    operation,
    serializedError.code,
  );
}

function registrationDatabaseErrorResponse(
  message: string,
  status: number,
  operation: string,
  errorCode: string | null,
) {
  return NextResponse.json(
    {
      message,
      operation,
      errorCode,
    },
    { status },
  );
}

function unwrapPrismaOperationError(error: unknown) {
  if (error instanceof RegistrationPrismaOperationError) {
    return {
      operation: error.operation,
      originalError: error.originalError,
    };
  }

  return {
    operation: "unknown",
    originalError: error,
  };
}

function serializeRegistrationError(error: unknown): {
  name: string;
  message: string;
  code: string | null;
  stackFirstThreeLines: string[];
} {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return {
      name: error.name,
      message: sanitizeLogText(error.message),
      code: error.code,
      stackFirstThreeLines: sanitizeStack(error.stack),
    };
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      name: error.name,
      message: sanitizeLogText(error.message),
      code: error.errorCode ?? null,
      stackFirstThreeLines: sanitizeStack(error.stack),
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: sanitizeLogText(error.message),
      code: null,
      stackFirstThreeLines: sanitizeStack(error.stack),
    };
  }

  return {
    name: "UnknownError",
    message: sanitizeLogText(String(error)),
    code: null,
    stackFirstThreeLines: [],
  };
}

function sanitizeStack(stack?: string) {
  return stack?.split("\n").slice(0, 3).map(sanitizeLogText) ?? [];
}

function sanitizeLogText(value: string) {
  return value
    .replace(/(postgres(?:ql)?:\/\/)([^:\s/@]+):([^@\s]+)@/gi, "$1$2:***@")
    .replace(/(DATABASE_URL=)(\S+)/gi, "$1***")
    .replace(/(DIRECT_URL=)(\S+)/gi, "$1***")
    .replace(/(POSTGRES_URL=)(\S+)/gi, "$1***")
    .replace(/(POSTGRES_PRISMA_URL=)(\S+)/gi, "$1***");
}

async function markPaymentInitializationFailed(
  debugContext: RegistrationApiDebugContext,
  paymentId: string,
  registrationId: string,
  rawInitializeResponse: Record<string, unknown>,
) {
  await withPrismaWriteDebug(debugContext, "payment.update.markInitializationFailed", () =>
    prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "FAILED",
        rawInitializeResponse: rawInitializeResponse as Prisma.InputJsonObject,
      },
    }),
  );

  await withPrismaWriteDebug(debugContext, "registration.update.markPaymentFailed", () =>
    prisma.registration.update({
      where: { id: registrationId },
      data: {
        status: "CANCELLED",
        paymentStatus: "FAILED",
      },
    }),
  );
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
