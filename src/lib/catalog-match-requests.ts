import "server-only";

import {
  Prisma,
  type VehicleCatalogMatchRequestStatus,
} from "@prisma/client";
import { runGarageSerializableTransaction } from "@/lib/garage-service";
import { prisma } from "@/lib/prisma";

export const openCatalogMatchRequestStatuses = [
  "PENDING",
  "IN_REVIEW",
] satisfies VehicleCatalogMatchRequestStatus[];

export type CatalogMatchRequestActionCode =
  | "invalid_vehicle"
  | "vehicle_not_found"
  | "vehicle_not_active"
  | "vehicle_already_matched"
  | "request_already_open"
  | "request_not_found"
  | "invalid_transition"
  | "completion_requires_catalog_match"
  | "completion_requires_active_definition"
  | "failed";

export type CatalogMatchRequestNotificationPayload = {
  requestId: string;
  memberDisplayName: string;
  memberEmail: string;
  vehicleId: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: number | null;
  plateNumber: string;
  createdAt: Date;
};

export type CatalogMatchCompletionNotice = {
  requestId: string;
  vehicleId: string;
  vehicleLabel: string;
  href: string;
};

type CatalogRequestMutationResult =
  | {
      ok: true;
      requestId: string;
    }
  | {
      ok: false;
      code: CatalogMatchRequestActionCode;
    };

type CreateCatalogMatchRequestResult =
  | {
      ok: true;
      created: true;
      requestId: string;
      notification: CatalogMatchRequestNotificationPayload;
    }
  | {
      ok: true;
      created: false;
      code: "request_already_open";
      requestId: string;
    }
  | {
      ok: false;
      code:
        | "invalid_vehicle"
        | "vehicle_not_found"
        | "vehicle_not_active"
        | "vehicle_already_matched";
    };

type CompleteCatalogMatchRequestResult =
  | {
      ok: true;
      requestId: string;
      completed: true;
      notification: CatalogMatchRequestNotificationPayload | null;
    }
  | {
      ok: true;
      requestId: string;
      completed: false;
    }
  | {
      ok: false;
      code: CatalogMatchRequestActionCode;
    };

const requestVehicleSelect = {
  id: true,
  userId: true,
  vehicleDefinitionId: true,
  brand: true,
  model: true,
  year: true,
  plateNumber: true,
  deletedAt: true,
  user: {
    select: {
      email: true,
      profile: {
        select: {
          fullName: true,
          displayName: true,
        },
      },
    },
  },
} satisfies Prisma.VehicleSelect;

const requestWithVehicleSelect = {
  id: true,
  userId: true,
  vehicleId: true,
  status: true,
  adminNote: true,
  memberNotifiedAt: true,
  memberNotificationEmailSentAt: true,
  vehicle: {
    select: {
      ...requestVehicleSelect,
      vehicleDefinition: {
        select: {
          id: true,
          active: true,
        },
      },
    },
  },
  user: {
    select: {
      email: true,
      profile: {
        select: {
          fullName: true,
          displayName: true,
        },
      },
    },
  },
  createdAt: true,
} satisfies Prisma.VehicleCatalogMatchRequestSelect;

type RequestVehicle = Prisma.VehicleGetPayload<{
  select: typeof requestVehicleSelect;
}>;

type RequestWithVehicle = Prisma.VehicleCatalogMatchRequestGetPayload<{
  select: typeof requestWithVehicleSelect;
}>;

export async function createCatalogMatchRequestForMember({
  userId,
  vehicleId,
  memberNote,
  ipAddress,
}: {
  userId: string;
  vehicleId: string;
  memberNote?: string | null;
  ipAddress?: string | null;
}): Promise<CreateCatalogMatchRequestResult> {
  const normalizedVehicleId = normalizeId(vehicleId);

  if (!normalizedVehicleId) {
    return {
      ok: false,
      code: "invalid_vehicle",
    };
  }

  return runGarageSerializableTransaction(async (tx) => {
    const vehicle = await tx.vehicle.findFirst({
      where: {
        id: normalizedVehicleId,
        userId,
      },
      select: requestVehicleSelect,
    });

    if (!vehicle) {
      return {
        ok: false as const,
        code: "vehicle_not_found" as const,
      };
    }

    if (vehicle.deletedAt) {
      return {
        ok: false as const,
        code: "vehicle_not_active" as const,
      };
    }

    if (vehicle.vehicleDefinitionId) {
      return {
        ok: false as const,
        code: "vehicle_already_matched" as const,
      };
    }

    const existingOpenRequest = await tx.vehicleCatalogMatchRequest.findFirst({
      where: {
        vehicleId: vehicle.id,
        status: {
          in: [...openCatalogMatchRequestStatuses],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
      },
    });

    if (existingOpenRequest) {
      return {
        ok: true as const,
        created: false as const,
        code: "request_already_open" as const,
        requestId: existingOpenRequest.id,
      };
    }

    const request = await tx.vehicleCatalogMatchRequest.create({
      data: {
        userId,
        vehicleId: vehicle.id,
        status: "PENDING",
        memberNote: normalizeNote(memberNote, 500),
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    await createCatalogMatchAuditLog({
      tx,
      action: "CATALOG_MATCH_REQUEST_CREATED",
      requestId: request.id,
      userId,
      vehicleId: vehicle.id,
      newStatus: "PENDING",
      reason: "Member requested vehicle catalog matching.",
      ipAddress,
    });

    return {
      ok: true as const,
      created: true as const,
      requestId: request.id,
      notification: notificationPayload({
        requestId: request.id,
        createdAt: request.createdAt,
        vehicle,
      }),
    };
  });
}

export async function recordCatalogRequestAdminNotificationResult({
  requestId,
  sent,
  ipAddress,
}: {
  requestId: string;
  sent: boolean;
  ipAddress?: string | null;
}) {
  const now = new Date();

  await prisma.vehicleCatalogMatchRequest.update({
    where: {
      id: requestId,
    },
    data: sent
      ? {
          adminNotificationEmailSentAt: now,
        }
      : {
          adminNotificationEmailFailedAt: now,
        },
  });

  await createCatalogMatchAuditLog({
    tx: prisma,
    action: sent
      ? "CATALOG_MATCH_ADMIN_NOTIFICATION_SENT"
      : "CATALOG_MATCH_ADMIN_NOTIFICATION_FAILED",
    requestId,
    notificationChannel: "email",
    notificationOutcome: sent ? "sent" : "failed",
    ipAddress,
  });
}

export async function markCatalogMatchRequestInReview({
  requestId,
  adminUserId,
  adminNote,
  ipAddress,
}: {
  requestId: string;
  adminUserId: string;
  adminNote?: string | null;
  ipAddress?: string | null;
}): Promise<CatalogRequestMutationResult> {
  return updateCatalogMatchRequestStatus({
    requestId,
    adminUserId,
    adminNote,
    ipAddress,
    action: "CATALOG_MATCH_REQUEST_IN_REVIEW",
    nextStatus: "IN_REVIEW",
    allowedCurrentStatuses: ["PENDING"],
  });
}

export async function rejectCatalogMatchRequest({
  requestId,
  adminUserId,
  adminNote,
  ipAddress,
}: {
  requestId: string;
  adminUserId: string;
  adminNote?: string | null;
  ipAddress?: string | null;
}): Promise<CatalogRequestMutationResult> {
  return updateCatalogMatchRequestStatus({
    requestId,
    adminUserId,
    adminNote,
    ipAddress,
    action: "CATALOG_MATCH_REQUEST_REJECTED",
    nextStatus: "REJECTED",
    allowedCurrentStatuses: ["PENDING", "IN_REVIEW"],
  });
}

export async function updateCatalogMatchRequestAdminNote({
  requestId,
  adminUserId,
  adminNote,
  ipAddress,
}: {
  requestId: string;
  adminUserId: string;
  adminNote: string | null;
  ipAddress?: string | null;
}): Promise<CatalogRequestMutationResult> {
  const normalizedNote = normalizeNote(adminNote, 1000);

  return runGarageSerializableTransaction(async (tx) => {
    const request = await tx.vehicleCatalogMatchRequest.findUnique({
      where: {
        id: requestId,
      },
      select: {
        id: true,
        adminNote: true,
      },
    });

    if (!request) {
      return {
        ok: false as const,
        code: "request_not_found" as const,
      };
    }

    await tx.vehicleCatalogMatchRequest.update({
      where: {
        id: request.id,
      },
      data: {
        adminNote: normalizedNote,
        resolvedByAdminUserId: adminUserId,
      },
      select: {
        id: true,
      },
    });

    await createCatalogMatchAuditLog({
      tx,
      action: "CATALOG_MATCH_REQUEST_ADMIN_NOTE_UPDATED",
      requestId: request.id,
      adminUserId,
      before: {
        adminNotePresent: Boolean(request.adminNote),
      },
      after: {
        adminNotePresent: Boolean(normalizedNote),
      },
      reason: normalizedNote,
      ipAddress,
    });

    return {
      ok: true as const,
      requestId: request.id,
    };
  });
}

export async function completeCatalogMatchRequest({
  requestId,
  adminUserId,
  adminNote,
  ipAddress,
}: {
  requestId: string;
  adminUserId: string;
  adminNote?: string | null;
  ipAddress?: string | null;
}): Promise<CompleteCatalogMatchRequestResult> {
  return runGarageSerializableTransaction(async (tx) => {
    const request = await tx.vehicleCatalogMatchRequest.findUnique({
      where: {
        id: requestId,
      },
      select: requestWithVehicleSelect,
    });

    if (!request) {
      return {
        ok: false as const,
        code: "request_not_found" as const,
      };
    }

    if (request.status === "COMPLETED") {
      return {
        ok: true as const,
        requestId: request.id,
        completed: false as const,
      };
    }

    if (!request.vehicle || request.vehicle.id !== request.vehicleId) {
      return {
        ok: false as const,
        code: "vehicle_not_found" as const,
      };
    }

    if (!request.vehicle.vehicleDefinitionId) {
      return {
        ok: false as const,
        code: "completion_requires_catalog_match" as const,
      };
    }

    if (!request.vehicle.vehicleDefinition?.active) {
      return {
        ok: false as const,
        code: "completion_requires_active_definition" as const,
      };
    }

    if (request.status === "REJECTED") {
      return {
        ok: false as const,
        code: "invalid_transition" as const,
      };
    }

    const now = new Date();
    const normalizedNote = normalizeNote(adminNote, 1000);

    await tx.vehicleCatalogMatchRequest.update({
      where: {
        id: request.id,
      },
      data: {
        status: "COMPLETED",
        adminNote: normalizedNote ?? request.adminNote,
        resolvedByAdminUserId: adminUserId,
        resolvedAt: now,
      },
      select: {
        id: true,
      },
    });

    await createCatalogMatchAuditLog({
      tx,
      action: "CATALOG_MATCH_REQUEST_COMPLETED",
      requestId: request.id,
      vehicleId: request.vehicle.id,
      userId: request.userId,
      adminUserId,
      oldStatus: request.status,
      newStatus: "COMPLETED",
      reason: normalizedNote,
      ipAddress,
    });

    const shouldNotifyMember =
      !request.memberNotifiedAt && !request.memberNotificationEmailSentAt;

    return {
      ok: true as const,
      requestId: request.id,
      completed: true as const,
      notification: shouldNotifyMember
        ? notificationPayload({
            requestId: request.id,
            createdAt: request.createdAt,
            request,
            vehicle: request.vehicle,
          })
        : null,
    };
  });
}

export async function recordCatalogMatchCompletionNotificationResult({
  requestId,
  sent,
  ipAddress,
}: {
  requestId: string;
  sent: boolean;
  ipAddress?: string | null;
}) {
  const now = new Date();

  await prisma.vehicleCatalogMatchRequest.update({
    where: {
      id: requestId,
    },
    data: sent
      ? {
          memberNotifiedAt: now,
          memberNotificationEmailSentAt: now,
        }
      : {
          memberNotificationEmailFailedAt: now,
        },
  });

  await createCatalogMatchAuditLog({
    tx: prisma,
    action: sent
      ? "CATALOG_MATCH_MEMBER_NOTIFICATION_SENT"
      : "CATALOG_MATCH_MEMBER_NOTIFICATION_FAILED",
    requestId,
    notificationChannel: "email",
    notificationOutcome: sent ? "sent" : "failed",
    ipAddress,
  });
}

export async function getRecentCatalogMatchCompletionNotices({
  userId,
  vehicleId,
  limit = 3,
}: {
  userId: string;
  vehicleId?: string | null;
  limit?: number;
}): Promise<CatalogMatchCompletionNotice[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const requests = await prisma.vehicleCatalogMatchRequest.findMany({
    where: {
      userId,
      status: "COMPLETED",
      resolvedAt: {
        gte: since,
      },
      ...(vehicleId ? { vehicleId } : {}),
      vehicle: {
        is: {
          deletedAt: null,
          vehicleDefinitionId: {
            not: null,
          },
        },
      },
    },
    orderBy: {
      resolvedAt: "desc",
    },
    take: limit,
    select: {
      id: true,
      vehicleId: true,
      vehicle: {
        select: {
          id: true,
          brand: true,
          model: true,
          year: true,
          plateNumber: true,
        },
      },
    },
  });

  return requests.flatMap((request) => {
    if (!request.vehicleId || !request.vehicle) {
      return [];
    }

    return [
      {
        requestId: request.id,
        vehicleId: request.vehicleId,
        vehicleLabel: vehicleLabel(request.vehicle),
        href: `/account/garage/${request.vehicleId}`,
      },
    ];
  });
}

async function updateCatalogMatchRequestStatus({
  requestId,
  adminUserId,
  adminNote,
  ipAddress,
  action,
  nextStatus,
  allowedCurrentStatuses,
}: {
  requestId: string;
  adminUserId: string;
  adminNote?: string | null;
  ipAddress?: string | null;
  action: string;
  nextStatus: VehicleCatalogMatchRequestStatus;
  allowedCurrentStatuses: VehicleCatalogMatchRequestStatus[];
}): Promise<CatalogRequestMutationResult> {
  return runGarageSerializableTransaction(async (tx) => {
    const request = await tx.vehicleCatalogMatchRequest.findUnique({
      where: {
        id: requestId,
      },
      select: {
        id: true,
        userId: true,
        vehicleId: true,
        status: true,
        adminNote: true,
      },
    });

    if (!request) {
      return {
        ok: false as const,
        code: "request_not_found" as const,
      };
    }

    if (request.status === nextStatus) {
      return {
        ok: true as const,
        requestId: request.id,
      };
    }

    if (!allowedCurrentStatuses.includes(request.status)) {
      return {
        ok: false as const,
        code: "invalid_transition" as const,
      };
    }

    const now = new Date();
    const normalizedNote = normalizeNote(adminNote, 1000);

    await tx.vehicleCatalogMatchRequest.update({
      where: {
        id: request.id,
      },
      data: {
        status: nextStatus,
        adminNote: normalizedNote ?? request.adminNote,
        resolvedByAdminUserId: adminUserId,
        ...(nextStatus === "REJECTED" ? { resolvedAt: now } : {}),
      },
      select: {
        id: true,
      },
    });

    await createCatalogMatchAuditLog({
      tx,
      action,
      requestId: request.id,
      vehicleId: request.vehicleId,
      userId: request.userId,
      adminUserId,
      oldStatus: request.status,
      newStatus: nextStatus,
      reason: normalizedNote,
      ipAddress,
    });

    return {
      ok: true as const,
      requestId: request.id,
    };
  });
}

function notificationPayload({
  requestId,
  createdAt,
  vehicle,
  request,
}: {
  requestId: string;
  createdAt: Date;
  vehicle: RequestVehicle;
  request?: RequestWithVehicle;
}): CatalogMatchRequestNotificationPayload {
  const user = request?.user ?? vehicle.user;

  return {
    requestId,
    memberDisplayName: displayNameForUser(user),
    memberEmail: user.email,
    vehicleId: vehicle.id,
    vehicleBrand: vehicle.brand,
    vehicleModel: vehicle.model,
    vehicleYear: vehicle.year,
    plateNumber: vehicle.plateNumber,
    createdAt,
  };
}

async function createCatalogMatchAuditLog({
  tx,
  action,
  requestId,
  userId,
  vehicleId,
  adminUserId,
  oldStatus,
  newStatus,
  notificationChannel,
  notificationOutcome,
  before,
  after,
  reason,
  ipAddress,
}: {
  tx: Pick<Prisma.TransactionClient, "auditLog"> | typeof prisma;
  action: string;
  requestId: string;
  userId?: string | null;
  vehicleId?: string | null;
  adminUserId?: string | null;
  oldStatus?: VehicleCatalogMatchRequestStatus | null;
  newStatus?: VehicleCatalogMatchRequestStatus | null;
  notificationChannel?: string | null;
  notificationOutcome?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  ipAddress?: string | null;
}) {
  await tx.auditLog.create({
    data: {
      adminUserId: adminUserId ?? null,
      action,
      before: sanitizeJson({
        requestId,
        userId,
        vehicleId,
        oldStatus,
        data: before ?? null,
      }),
      after: sanitizeJson({
        requestId,
        userId,
        vehicleId,
        newStatus,
        notificationChannel,
        notificationOutcome,
        data: after ?? null,
      }),
      reason: normalizeNote(reason, 500),
      ipAddress: ipAddress ?? null,
    },
  });
}

function displayNameForUser(user: {
  email: string;
  profile: {
    fullName: string | null;
    displayName: string | null;
  } | null;
}) {
  return user.profile?.displayName || user.profile?.fullName || user.email;
}

function vehicleLabel(vehicle: {
  brand: string;
  model: string;
  year: number | null;
  plateNumber: string;
}) {
  return [vehicle.brand, vehicle.model, vehicle.year, vehicle.plateNumber]
    .filter(Boolean)
    .join(" · ");
}

function normalizeId(value: string) {
  const normalized = value.trim();

  return normalized || null;
}

function normalizeNote(value: string | null | undefined, maxLength: number) {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function sanitizeJson(value: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(value));
}
