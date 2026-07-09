import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { sendRegistrationApprovedEmail } from "./email";
import { kulaCheckInDate } from "./event-config";
import { prisma } from "./prisma";
import { generateQrToken, hashQrToken } from "./qr";

export type ManualPaymentConfirmationResult =
  | {
      status: "confirmed";
      registrationId: string;
      participantCode: string;
    }
  | {
      status: "already_confirmed";
      registrationId: string;
    }
  | {
      status: "rejected";
      reason: "registration_not_found" | "not_pending_payment";
    };

export async function confirmManualRegistrationPayment({
  registrationId,
  adminEmail,
  ipAddress,
}: {
  registrationId: string;
  adminEmail: string;
  ipAddress?: string | null;
}): Promise<ManualPaymentConfirmationResult> {
  const confirmation = await runSerializableTransaction(() =>
    prisma.$transaction(
      async (tx) => {
        const adminUser = await tx.adminUser.upsert({
          where: {
            email: adminEmail,
          },
          update: {},
          create: {
            email: adminEmail,
            name: adminEmail,
            role: "OWNER",
          },
          select: {
            id: true,
          },
        });
        const registration = await tx.registration.findUnique({
          where: {
            id: registrationId,
          },
          include: {
            event: true,
            package: true,
            payments: {
              where: {
                provider: "MANUAL",
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
            },
          },
        });

        if (!registration) {
          await tx.auditLog.create({
            data: {
              adminUserId: adminUser.id,
              action: "MANUAL_PAYMENT_REJECTED",
              after: {
                registrationId,
                reason: "registration_not_found",
              },
              reason: "Manual payment confirmation rejected because registration was not found.",
              ipAddress,
            },
          });

          return {
            status: "rejected" as const,
            reason: "registration_not_found" as const,
            email: null,
          };
        }

        if (registration.status === "CONFIRMED" && registration.paymentStatus === "PAID") {
          return {
            status: "already_confirmed" as const,
            registrationId: registration.id,
            email: null,
          };
        }

        if (registration.status !== "PENDING_PAYMENT" || registration.paymentStatus !== "UNPAID") {
          await tx.auditLog.create({
            data: {
              adminUserId: adminUser.id,
              registrationId: registration.id,
              action: "MANUAL_PAYMENT_REJECTED",
              before: {
                status: registration.status,
                paymentStatus: registration.paymentStatus,
              },
              after: {
                reason: "not_pending_payment",
              },
              reason:
                "Manual payment confirmation rejected because registration is not pending unpaid payment.",
              ipAddress,
            },
          });

          return {
            status: "rejected" as const,
            reason: "not_pending_payment" as const,
            email: null,
          };
        }

        const participantCode =
          registration.participantCode ?? (await generateParticipantCode(tx, registration.event));
        const rawQrToken = generateQrToken();
        const qrTokenHash = hashQrToken(rawQrToken);
        const now = new Date();
        const existingManualPayment = registration.payments[0];

        if (existingManualPayment) {
          await tx.payment.update({
            where: {
              id: existingManualPayment.id,
            },
            data: {
              provider: "MANUAL",
              amount: registration.package.price,
              currency: registration.package.currency,
              status: "SUCCESS",
              rawCallbackResponse: {
                source: "admin_manual_confirmation",
                confirmedAt: now.toISOString(),
              },
            },
          });
        } else {
          await tx.payment.create({
            data: {
              registrationId: registration.id,
              provider: "MANUAL",
              conversationId: `manual-${randomUUID()}`,
              amount: registration.package.price,
              currency: registration.package.currency,
              status: "SUCCESS",
              rawCallbackResponse: {
                source: "admin_manual_confirmation",
                confirmedAt: now.toISOString(),
              },
            },
          });
        }

        await tx.registration.update({
          where: {
            id: registration.id,
          },
          data: {
            status: "CONFIRMED",
            paymentStatus: "PAID",
            participantCode,
            qrTokenHash,
            qrIssuedAt: now,
          },
        });

        await tx.checkIn.upsert({
          where: {
            registrationId_eventDate: {
              registrationId: registration.id,
              eventDate: kulaCheckInDate,
            },
          },
          update: {},
          create: {
            registrationId: registration.id,
            eventDate: kulaCheckInDate,
            status: "ELIGIBLE",
          },
        });

        await tx.auditLog.create({
          data: {
            adminUserId: adminUser.id,
            registrationId: registration.id,
            action: "MANUAL_PAYMENT_CONFIRMED",
            before: {
              status: registration.status,
              paymentStatus: registration.paymentStatus,
              participantCode: registration.participantCode,
              qrIssuedAt: registration.qrIssuedAt?.toISOString() ?? null,
            },
            after: {
              status: "CONFIRMED",
              paymentStatus: "PAID",
              participantCode,
              qrIssuedAt: now.toISOString(),
            },
            reason: "Admin manually confirmed payment and registration.",
            ipAddress,
          },
        });

        return {
          status: "confirmed" as const,
          registrationId: registration.id,
          participantCode,
          email: {
            registrationId: registration.id,
            to: registration.email,
            fullName: registration.fullName,
            participantCode,
            carBrandModel: registration.carBrandModel,
            plateNumber: registration.plateNumber,
            rawQrToken,
          },
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    ),
  );

  if (confirmation.email) {
    await sendRegistrationApprovedEmail(confirmation.email);
  }

  if (confirmation.status === "confirmed") {
    return {
      status: confirmation.status,
      registrationId: confirmation.registrationId,
      participantCode: confirmation.participantCode,
    };
  }

  if (confirmation.status === "already_confirmed") {
    return {
      status: confirmation.status,
      registrationId: confirmation.registrationId,
    };
  }

  return {
    status: "rejected",
    reason: confirmation.reason,
  };
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
