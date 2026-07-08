import { Prisma } from "@prisma/client";
import { sendConfirmationEmail } from "./email";
import type { IyzicoCheckoutResponse } from "./iyzico";
import { prisma } from "./prisma";
import { generateQrToken, hashQrToken } from "./qr";

export type PaymentFinalizationResult = {
  status: "confirmed" | "already_confirmed" | "failed" | "unverified" | "missing";
  registrationId?: string;
  reason?: string;
};

export async function finalizeCheckoutPayment({
  paymentId,
  checkoutResult,
  failUnverified,
  sendEmail = true,
}: {
  paymentId: string;
  checkoutResult: IyzicoCheckoutResponse;
  failUnverified: boolean;
  sendEmail?: boolean;
}): Promise<PaymentFinalizationResult> {
  const confirmation = await runSerializableTransaction(() =>
    prisma.$transaction(
      async (tx) => {
        const latestPayment = await tx.payment.findUnique({
          where: { id: paymentId },
          include: {
            registration: {
              include: {
                event: {
                  include: {
                    days: {
                      orderBy: {
                        date: "asc",
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!latestPayment) {
          return {
            status: "missing" as const,
            email: null,
          };
        }

        if (
          latestPayment.status === "SUCCESS" &&
          latestPayment.registration.status === "CONFIRMED" &&
          latestPayment.registration.paymentStatus === "PAID"
        ) {
          await tx.payment.update({
            where: { id: latestPayment.id },
            data: {
              rawCallbackResponse: checkoutResult as Prisma.InputJsonObject,
            },
          });

          return {
            status: "already_confirmed" as const,
            registrationId: latestPayment.registrationId,
            email: null,
          };
        }

        const verification = verifyCheckoutResult(latestPayment, checkoutResult);

        if (!verification.ok || latestPayment.registration.status !== "PENDING_PAYMENT") {
          if (!failUnverified) {
            await tx.payment.update({
              where: { id: latestPayment.id },
              data: {
                iyzicoPaymentId: stringifyOptional(checkoutResult.paymentId),
                rawCallbackResponse: checkoutResult as Prisma.InputJsonObject,
              },
            });

            return {
              status: "unverified" as const,
              registrationId: latestPayment.registrationId,
              reason:
                latestPayment.registration.status !== "PENDING_PAYMENT"
                  ? "registration_not_pending"
                  : verification.reason,
              email: null,
            };
          }

          await tx.payment.update({
            where: { id: latestPayment.id },
            data: {
              status: "FAILED",
              iyzicoPaymentId: stringifyOptional(checkoutResult.paymentId),
              rawCallbackResponse: checkoutResult as Prisma.InputJsonObject,
            },
          });

          if (latestPayment.registration.status === "PENDING_PAYMENT") {
            await tx.registration.update({
              where: { id: latestPayment.registrationId },
              data: {
                status: "CANCELLED",
                paymentStatus: "FAILED",
              },
            });
          }

          return {
            status: "failed" as const,
            registrationId: latestPayment.registrationId,
            reason:
              latestPayment.registration.status !== "PENDING_PAYMENT"
                ? "registration_not_pending"
                : verification.reason,
            email: null,
          };
        }

        const participantCode =
          latestPayment.registration.participantCode ??
          (await generateParticipantCode(tx, latestPayment.registration.event));
        const rawQrToken = generateQrToken();
        const qrTokenHash = hashQrToken(rawQrToken);
        const eventDate = latestPayment.registration.event.days[0]?.date;

        await tx.payment.update({
          where: { id: latestPayment.id },
          data: {
            status: "SUCCESS",
            iyzicoPaymentId: stringifyOptional(checkoutResult.paymentId),
            rawCallbackResponse: checkoutResult as Prisma.InputJsonObject,
          },
        });

        await tx.registration.update({
          where: { id: latestPayment.registrationId },
          data: {
            status: "CONFIRMED",
            paymentStatus: "PAID",
            participantCode,
            qrTokenHash,
            qrIssuedAt: new Date(),
          },
        });

        if (eventDate) {
          await tx.checkIn.upsert({
            where: {
              registrationId_eventDate: {
                registrationId: latestPayment.registrationId,
                eventDate,
              },
            },
            update: {},
            create: {
              registrationId: latestPayment.registrationId,
              eventDate,
              status: "ELIGIBLE",
            },
          });
        }

        return {
          status: "confirmed" as const,
          registrationId: latestPayment.registrationId,
          email: {
            registrationId: latestPayment.registrationId,
            to: latestPayment.registration.email,
            fullName: latestPayment.registration.fullName,
            participantCode,
            carBrandModel: latestPayment.registration.carBrandModel,
            plateNumber: latestPayment.registration.plateNumber,
            rawQrToken,
          },
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    ),
  );

  if (sendEmail && confirmation.email) {
    await sendConfirmationEmail(confirmation.email);
  }

  return {
    status: confirmation.status,
    registrationId: confirmation.registrationId,
    reason: confirmation.reason,
  };
}

export function verifyCheckoutResult(
  payment: {
    registrationId: string;
    iyzicoToken: string | null;
    conversationId: string;
    amount: Prisma.Decimal;
    currency: string;
  },
  checkoutResult: IyzicoCheckoutResponse,
) {
  if (checkoutResult.status !== "success") {
    return { ok: false, reason: "iyzico_status" };
  }

  if (checkoutResult.paymentStatus && checkoutResult.paymentStatus !== "SUCCESS") {
    return { ok: false, reason: "payment_status" };
  }

  if (checkoutResult.token && checkoutResult.token !== payment.iyzicoToken) {
    return { ok: false, reason: "token" };
  }

  if (checkoutResult.conversationId && checkoutResult.conversationId !== payment.conversationId) {
    return { ok: false, reason: "conversation" };
  }

  if (checkoutResult.basketId && checkoutResult.basketId !== payment.registrationId) {
    return { ok: false, reason: "basket" };
  }

  if (checkoutResult.currency && checkoutResult.currency !== payment.currency) {
    return { ok: false, reason: "currency" };
  }

  const paidPrice = checkoutResult.paidPrice ?? checkoutResult.price;

  if (!decimalMatches(paidPrice, payment.amount)) {
    return { ok: false, reason: "amount" };
  }

  if (checkoutResult.price && !decimalMatches(checkoutResult.price, payment.amount)) {
    return { ok: false, reason: "price" };
  }

  return { ok: true };
}

function decimalMatches(value: unknown, expected: Prisma.Decimal) {
  if (value === undefined || value === null || value === "") {
    return false;
  }

  try {
    return new Prisma.Decimal(String(value)).equals(expected);
  } catch {
    return false;
  }
}

function stringifyOptional(value: unknown) {
  return value === undefined || value === null ? null : String(value);
}

async function runSerializableTransaction<T>(operation: () => Promise<T>) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt < 3 && isSerializableConflict(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Serializable transaction failed.");
}

function isSerializableConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

async function generateParticipantCode(
  tx: Prisma.TransactionClient,
  event: {
    id: string;
    code: string;
    startsAt: Date;
  },
) {
  const updatedEvent = await tx.event.update({
    where: { id: event.id },
    data: {
      participantSequenceNext: {
        increment: 1,
      },
    },
    select: {
      participantSequenceNext: true,
    },
  });
  const sequence = updatedEvent.participantSequenceNext - 1;
  const year = event.startsAt.getUTCFullYear();

  return `ATD-${event.code}-${year}-${String(sequence).padStart(4, "0")}`;
}
