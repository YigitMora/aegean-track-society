import { Prisma } from "@prisma/client";
import { kulaCheckInDate, kulaEventSlug } from "@/lib/event-config";
import { prisma } from "@/lib/prisma";
import { hashQrToken } from "@/lib/qr";

const checkInRegistrationSelect = Prisma.validator<Prisma.RegistrationSelect>()({
  id: true,
  participantCode: true,
  fullName: true,
  phone: true,
  email: true,
  carBrandModel: true,
  plateNumber: true,
  status: true,
  paymentStatus: true,
  createdAt: true,
  package: {
    select: {
      code: true,
      name: true,
    },
  },
  checkIns: {
    where: {
      eventDate: kulaCheckInDate,
    },
    select: {
      id: true,
      eventDate: true,
      status: true,
      checkedInAt: true,
      duplicateAttemptCount: true,
      checkedInByAdmin: {
        select: {
          email: true,
          name: true,
        },
      },
      updatedAt: true,
    },
    take: 1,
  },
});

export type CheckInRegistration = Prisma.RegistrationGetPayload<{
  select: typeof checkInRegistrationSelect;
}>;

export type QrLookupResult =
  | {
      type: "found";
      registration: CheckInRegistration;
    }
  | {
      type: "invalid";
      reason: "invalid_token" | "not_confirmed_paid";
    };

export type CheckInActionResult =
  | {
      type: "checked_in";
      checkedInAt: Date;
    }
  | {
      type: "duplicate";
      checkedInAt: Date | null;
      duplicateAttemptCount: number;
    }
  | {
      type: "rejected";
      reason:
        | "registration_not_found"
        | "not_confirmed_paid"
        | "check_in_not_found"
        | "not_eligible";
    };

export async function lookupRegistrationByQrToken(rawToken: string): Promise<QrLookupResult> {
  const qrTokenHash = hashQrToken(rawToken);
  const registration = await prisma.registration.findFirst({
    where: {
      qrTokenHash,
      deletedAt: null,
    },
    select: checkInRegistrationSelect,
  });

  if (!registration) {
    return {
      type: "invalid",
      reason: "invalid_token",
    };
  }

  if (!isConfirmedPaid(registration)) {
    return {
      type: "invalid",
      reason: "not_confirmed_paid",
    };
  }

  return {
    type: "found",
    registration,
  };
}

export async function searchCheckInRegistrations(query: string): Promise<CheckInRegistration[]> {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    return [];
  }

  return prisma.registration.findMany({
    where: {
      deletedAt: null,
      event: {
        slug: kulaEventSlug,
      },
      OR: [
        { participantCode: { contains: normalizedQuery, mode: "insensitive" } },
        { fullName: { contains: normalizedQuery, mode: "insensitive" } },
        { phone: { contains: normalizedQuery, mode: "insensitive" } },
        { email: { contains: normalizedQuery, mode: "insensitive" } },
        { plateNumber: { contains: normalizedQuery, mode: "insensitive" } },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
    select: checkInRegistrationSelect,
  });
}

export async function getCheckInRegistrationById(
  registrationId: string,
): Promise<CheckInRegistration | null> {
  return prisma.registration.findFirst({
    where: {
      id: registrationId,
      deletedAt: null,
      event: {
        slug: kulaEventSlug,
      },
    },
    select: checkInRegistrationSelect,
  });
}

export async function confirmRegistrationCheckIn({
  registrationId,
  adminUserId,
  ipAddress,
}: {
  registrationId: string;
  adminUserId: string;
  ipAddress?: string | null;
}): Promise<CheckInActionResult> {
  return prisma.$transaction(async (tx) => {
    const registration = await tx.registration.findFirst({
      where: {
        id: registrationId,
        deletedAt: null,
        event: {
          slug: kulaEventSlug,
        },
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        participantCode: true,
        checkIns: {
          where: {
            eventDate: kulaCheckInDate,
          },
          select: {
            id: true,
            status: true,
            checkedInAt: true,
            checkedInByAdminId: true,
            duplicateAttemptCount: true,
          },
          take: 1,
        },
      },
    });

    if (!registration) {
      await tx.auditLog.create({
        data: {
          adminUserId,
          action: "CHECK_IN_REJECTED",
          after: {
            registrationId,
            reason: "registration_not_found",
          },
          reason: "Check-in rejected because registration was not found.",
          ipAddress,
        },
      });

      return {
        type: "rejected",
        reason: "registration_not_found",
      };
    }

    if (!isConfirmedPaid(registration)) {
      await tx.auditLog.create({
        data: {
          adminUserId,
          registrationId: registration.id,
          action: "CHECK_IN_REJECTED",
          before: {
            status: registration.status,
            paymentStatus: registration.paymentStatus,
          },
          after: {
            reason: "not_confirmed_paid",
          },
          reason: "Check-in rejected because registration is not confirmed and paid.",
          ipAddress,
        },
      });

      return {
        type: "rejected",
        reason: "not_confirmed_paid",
      };
    }

    const checkIn = registration.checkIns[0];

    if (!checkIn) {
      await tx.auditLog.create({
        data: {
          adminUserId,
          registrationId: registration.id,
          action: "CHECK_IN_REJECTED",
          after: {
            reason: "check_in_not_found",
            eventDate: toIso(kulaCheckInDate),
          },
          reason: "Check-in rejected because the eligible event date row was not found.",
          ipAddress,
        },
      });

      return {
        type: "rejected",
        reason: "check_in_not_found",
      };
    }

    if (checkIn.status === "CHECKED_IN") {
      const updatedCheckIn = await tx.checkIn.update({
        where: {
          id: checkIn.id,
        },
        data: {
          duplicateAttemptCount: {
            increment: 1,
          },
        },
        select: {
          checkedInAt: true,
          duplicateAttemptCount: true,
        },
      });

      await tx.auditLog.create({
        data: {
          adminUserId,
          registrationId: registration.id,
          action: "CHECK_IN_DUPLICATE_ATTEMPT",
          before: {
            status: checkIn.status,
            checkedInAt: toIso(checkIn.checkedInAt),
            duplicateAttemptCount: checkIn.duplicateAttemptCount,
          },
          after: {
            checkedInAt: toIso(updatedCheckIn.checkedInAt),
            duplicateAttemptCount: updatedCheckIn.duplicateAttemptCount,
          },
          reason: "Duplicate check-in attempt recorded without overwriting original check-in.",
          ipAddress,
        },
      });

      return {
        type: "duplicate",
        checkedInAt: updatedCheckIn.checkedInAt,
        duplicateAttemptCount: updatedCheckIn.duplicateAttemptCount,
      };
    }

    if (checkIn.status !== "ELIGIBLE" || checkIn.checkedInAt) {
      await tx.auditLog.create({
        data: {
          adminUserId,
          registrationId: registration.id,
          action: "CHECK_IN_REJECTED",
          before: {
            status: checkIn.status,
            checkedInAt: toIso(checkIn.checkedInAt),
          },
          after: {
            reason: "not_eligible",
          },
          reason: "Check-in rejected because the participant is not eligible.",
          ipAddress,
        },
      });

      return {
        type: "rejected",
        reason: "not_eligible",
      };
    }

    const checkedInAt = new Date();
    const updateResult = await tx.checkIn.updateMany({
      where: {
        id: checkIn.id,
        status: "ELIGIBLE",
        checkedInAt: null,
      },
      data: {
        status: "CHECKED_IN",
        checkedInAt,
        checkedInByAdminId: adminUserId,
      },
    });

    if (updateResult.count === 0) {
      const latestCheckIn = await tx.checkIn.findUnique({
        where: {
          id: checkIn.id,
        },
        select: {
          status: true,
          checkedInAt: true,
          duplicateAttemptCount: true,
        },
      });

      if (latestCheckIn?.status !== "CHECKED_IN") {
        await tx.auditLog.create({
          data: {
            adminUserId,
            registrationId: registration.id,
            action: "CHECK_IN_REJECTED",
            before: {
              status: checkIn.status,
              checkedInAt: toIso(checkIn.checkedInAt),
            },
            after: {
              reason: "not_eligible",
              latestStatus: latestCheckIn?.status ?? null,
            },
            reason: "Check-in rejected after concurrent update because the participant is not eligible.",
            ipAddress,
          },
        });

        return {
          type: "rejected",
          reason: "not_eligible",
        };
      }

      const duplicateCheckIn = await tx.checkIn.update({
        where: {
          id: checkIn.id,
        },
        data: {
          duplicateAttemptCount: {
            increment: 1,
          },
        },
        select: {
          checkedInAt: true,
          duplicateAttemptCount: true,
        },
      });

      await tx.auditLog.create({
        data: {
          adminUserId,
          registrationId: registration.id,
          action: "CHECK_IN_DUPLICATE_ATTEMPT",
          before: {
            status: checkIn.status,
            checkedInAt: toIso(checkIn.checkedInAt),
          },
          after: {
            checkedInAt: toIso(duplicateCheckIn.checkedInAt),
            duplicateAttemptCount: duplicateCheckIn.duplicateAttemptCount,
          },
          reason: "Duplicate check-in attempt recorded after concurrent update.",
          ipAddress,
        },
      });

      return {
        type: "duplicate",
        checkedInAt: duplicateCheckIn.checkedInAt,
        duplicateAttemptCount: duplicateCheckIn.duplicateAttemptCount,
      };
    }

    await tx.auditLog.create({
      data: {
        adminUserId,
        registrationId: registration.id,
        action: "CHECKED_IN",
        before: {
          status: checkIn.status,
          checkedInAt: toIso(checkIn.checkedInAt),
        },
        after: {
          status: "CHECKED_IN",
          checkedInAt: toIso(checkedInAt),
          checkedInByAdminId: adminUserId,
        },
        reason: "Participant checked in for Kula MyTrack.",
        ipAddress,
      },
    });

    return {
      type: "checked_in",
      checkedInAt,
    };
  });
}

export function isConfirmedPaid(registration: {
  status: string;
  paymentStatus: string;
}) {
  return registration.status === "CONFIRMED" && registration.paymentStatus === "PAID";
}

export function extractQrTokenFromInput(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  const fromUrl = extractTokenFromUrl(trimmed);
  const token = fromUrl ?? trimmed;

  if (!/^[A-Za-z0-9_-]{20,200}$/.test(token)) {
    return null;
  }

  return token;
}

export function resultQueryForCheckInAction(result: CheckInActionResult) {
  if (result.type === "checked_in") {
    return "checked-in";
  }

  if (result.type === "duplicate") {
    return "duplicate";
  }

  return result.reason;
}

function extractTokenFromUrl(value: string) {
  try {
    const url = new URL(value, "http://local.invalid");
    const parts = url.pathname.split("/").filter(Boolean);
    const [route, token] = parts;

    if (route !== "check-in" || !token) {
      return null;
    }

    if (parts.length !== 2) {
      return null;
    }

    return decodeURIComponent(token);
  } catch {
    return null;
  }
}

function toIso(value: Date | null) {
  return value ? value.toISOString() : null;
}
