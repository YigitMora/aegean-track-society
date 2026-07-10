"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCompleteMemberUser } from "@/lib/member-access";
import { prisma } from "@/lib/prisma";
import { parseVehicleForm } from "@/lib/vehicle-validation";

type GarageError =
  | "invalid"
  | "duplicate_plate"
  | "not_found"
  | "archive_failed"
  | "restore_conflict"
  | "primary_conflict"
  | "failed";

const garagePath = "/account/garage";

export async function createVehicleAction(formData: FormData) {
  const memberUser = await requireCompleteMemberUser("/account/garage/new");
  const parsed = parseVehicleForm(formData);

  if (!parsed.ok) {
    redirectWithError("/account/garage/new", "invalid");
  }

  try {
    const duplicateVehicle = await prisma.vehicle.findFirst({
      where: {
        userId: memberUser.id,
        plateNumber: parsed.data.plateNumber,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (duplicateVehicle) {
      redirectWithError("/account/garage/new", "duplicate_plate");
    }

    const activePrimaryCount = await prisma.vehicle.count({
      where: {
        userId: memberUser.id,
        deletedAt: null,
        isPrimary: true,
      },
    });
    const shouldBecomePrimary = parsed.data.isPrimary || activePrimaryCount === 0;

    const vehicleData = {
      userId: memberUser.id,
      brand: parsed.data.brand,
      model: parsed.data.model,
      year: parsed.data.year,
      plateNumber: parsed.data.plateNumber,
      color: parsed.data.color,
      isPrimary: shouldBecomePrimary,
    };

    const vehicle = shouldBecomePrimary
      ? (
          await prisma.$transaction([
            prisma.vehicle.updateMany({
              where: {
                userId: memberUser.id,
                deletedAt: null,
                isPrimary: true,
              },
              data: {
                isPrimary: false,
              },
            }),
            prisma.vehicle.create({
              data: vehicleData,
              select: {
                id: true,
              },
            }),
          ])
        )[1]
      : await prisma.vehicle.create({
          data: vehicleData,
          select: {
            id: true,
          },
        });

    console.log("GARAGE_VEHICLE_CREATED", {
      userId: memberUser.id,
      vehicleId: vehicle.id,
      operation: "create",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logGarageFailure(memberUser.id, "create", error);
    redirectWithError("/account/garage/new", errorCodeForVehicleWrite(error, "duplicate_plate"));
  }

  revalidateGarage();
  redirect(`${garagePath}?garage=created`);
}

export async function updateVehicleAction(vehicleId: string, formData: FormData) {
  const memberUser = await requireCompleteMemberUser(`/account/garage/${vehicleId}`);
  const parsed = parseVehicleForm(formData);

  if (!parsed.ok) {
    redirectWithError(`/account/garage/${vehicleId}`, "invalid");
  }

  try {
    const existingVehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        userId: memberUser.id,
        deletedAt: null,
      },
      select: {
        id: true,
        isPrimary: true,
      },
    });

    if (!existingVehicle) {
      redirectWithError(garagePath, "not_found");
    }

    const duplicateVehicle = await prisma.vehicle.findFirst({
      where: {
        userId: memberUser.id,
        plateNumber: parsed.data.plateNumber,
        deletedAt: null,
        id: {
          not: vehicleId,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicateVehicle) {
      redirectWithError(`/account/garage/${vehicleId}`, "duplicate_plate");
    }

    const updateData = {
      brand: parsed.data.brand,
      model: parsed.data.model,
      year: parsed.data.year,
      plateNumber: parsed.data.plateNumber,
      color: parsed.data.color,
    };

    if (parsed.data.isPrimary && !existingVehicle.isPrimary) {
      const [, updatedVehicle] = await prisma.$transaction([
        prisma.vehicle.updateMany({
          where: {
            userId: memberUser.id,
            deletedAt: null,
            isPrimary: true,
          },
          data: {
            isPrimary: false,
          },
        }),
        prisma.vehicle.updateMany({
          where: {
            id: vehicleId,
            userId: memberUser.id,
            deletedAt: null,
          },
          data: {
            ...updateData,
            isPrimary: true,
          },
        }),
      ]);

      if (updatedVehicle.count === 0) {
        redirectWithError(garagePath, "not_found");
      }
    } else {
      const updatedVehicle = await prisma.vehicle.updateMany({
        where: {
          id: vehicleId,
          userId: memberUser.id,
          deletedAt: null,
        },
        data: updateData,
      });

      if (updatedVehicle.count === 0) {
        redirectWithError(garagePath, "not_found");
      }
    }

    console.log("GARAGE_VEHICLE_UPDATED", {
      userId: memberUser.id,
      vehicleId,
      operation: "update",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logGarageFailure(memberUser.id, "update", error, vehicleId);
    redirectWithError(
      `/account/garage/${vehicleId}`,
      errorCodeForVehicleWrite(error, "duplicate_plate"),
    );
  }

  revalidateGarage();
  redirect(`${garagePath}?garage=updated`);
}

export async function makePrimaryVehicleAction(vehicleId: string) {
  const memberUser = await requireCompleteMemberUser(garagePath);

  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        userId: memberUser.id,
        deletedAt: null,
      },
      select: {
        id: true,
        isPrimary: true,
      },
    });

    if (!vehicle) {
      redirectWithError(garagePath, "not_found");
    }

    if (!vehicle.isPrimary) {
      const [, updatedVehicle] = await prisma.$transaction([
        prisma.vehicle.updateMany({
          where: {
            userId: memberUser.id,
            deletedAt: null,
            isPrimary: true,
          },
          data: {
            isPrimary: false,
          },
        }),
        prisma.vehicle.updateMany({
          where: {
            id: vehicleId,
            userId: memberUser.id,
            deletedAt: null,
          },
          data: {
            isPrimary: true,
          },
        }),
      ]);

      if (updatedVehicle.count === 0) {
        redirectWithError(garagePath, "not_found");
      }

      console.log("GARAGE_PRIMARY_CHANGED", {
        userId: memberUser.id,
        vehicleId,
        operation: "make_primary",
      });
    }
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logGarageFailure(memberUser.id, "make_primary", error, vehicleId);
    redirectWithError(garagePath, errorCodeForVehicleWrite(error, "primary_conflict"));
  }

  revalidateGarage();
  redirect(`${garagePath}?garage=primary`);
}

export async function archiveVehicleAction(vehicleId: string) {
  const memberUser = await requireCompleteMemberUser(garagePath);

  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        userId: memberUser.id,
        deletedAt: null,
      },
      select: {
        id: true,
        isPrimary: true,
      },
    });

    if (!vehicle) {
      redirectWithError(garagePath, "not_found");
    }

    const now = new Date();

    if (vehicle.isPrimary) {
      const nextPrimaryVehicle = await prisma.vehicle.findFirst({
        where: {
          userId: memberUser.id,
          deletedAt: null,
          id: {
            not: vehicleId,
          },
        },
        orderBy: [
          {
            createdAt: "asc",
          },
          {
            id: "asc",
          },
        ],
        select: {
          id: true,
        },
      });

      const operations = [
        prisma.vehicle.updateMany({
          where: {
            id: vehicleId,
            userId: memberUser.id,
            deletedAt: null,
          },
          data: {
            deletedAt: now,
            isPrimary: false,
          },
        }),
      ];

      if (nextPrimaryVehicle) {
        operations.push(
          prisma.vehicle.updateMany({
            where: {
              id: nextPrimaryVehicle.id,
              userId: memberUser.id,
              deletedAt: null,
            },
            data: {
              isPrimary: true,
            },
          }),
        );
      }

      const [archivedVehicle] = await prisma.$transaction(operations);

      if (archivedVehicle.count === 0) {
        redirectWithError(garagePath, "not_found");
      }
    } else {
      const archivedVehicle = await prisma.vehicle.updateMany({
        where: {
          id: vehicleId,
          userId: memberUser.id,
          deletedAt: null,
        },
        data: {
          deletedAt: now,
          isPrimary: false,
        },
      });

      if (archivedVehicle.count === 0) {
        redirectWithError(garagePath, "not_found");
      }
    }

    console.log("GARAGE_VEHICLE_ARCHIVED", {
      userId: memberUser.id,
      vehicleId,
      operation: "archive",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logGarageFailure(memberUser.id, "archive", error, vehicleId);
    redirectWithError(garagePath, "archive_failed");
  }

  revalidateGarage();
  redirect(`${garagePath}?garage=archived`);
}

export async function restoreVehicleAction(vehicleId: string) {
  const memberUser = await requireCompleteMemberUser(garagePath);

  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        userId: memberUser.id,
        deletedAt: {
          not: null,
        },
      },
      select: {
        id: true,
        plateNumber: true,
      },
    });

    if (!vehicle) {
      redirectWithError(garagePath, "not_found");
    }

    const duplicateVehicle = await prisma.vehicle.findFirst({
      where: {
        userId: memberUser.id,
        plateNumber: vehicle.plateNumber,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (duplicateVehicle) {
      redirectWithError(garagePath, "restore_conflict");
    }

    const activePrimaryVehicle = await prisma.vehicle.findFirst({
      where: {
        userId: memberUser.id,
        deletedAt: null,
        isPrimary: true,
      },
      select: {
        id: true,
      },
    });

    const restoredVehicle = await prisma.vehicle.updateMany({
      where: {
        id: vehicleId,
        userId: memberUser.id,
        deletedAt: {
          not: null,
        },
      },
      data: {
        deletedAt: null,
        isPrimary: !activePrimaryVehicle,
      },
    });

    if (restoredVehicle.count === 0) {
      redirectWithError(garagePath, "not_found");
    }

    console.log("GARAGE_VEHICLE_RESTORED", {
      userId: memberUser.id,
      vehicleId,
      operation: "restore",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logGarageFailure(memberUser.id, "restore", error, vehicleId);
    redirectWithError(garagePath, errorCodeForVehicleWrite(error, "restore_conflict"));
  }

  revalidateGarage();
  redirect(`${garagePath}?garage=restored`);
}

function revalidateGarage() {
  revalidatePath("/account");
  revalidatePath(garagePath);
}

function redirectWithError(pathname: string, error: GarageError): never {
  redirect(`${pathname}?garageError=${error}`);
}

function errorCodeForVehicleWrite(error: unknown, fallback: GarageError): GarageError {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = Array.isArray(error.meta?.target)
      ? error.meta.target.join(",")
      : String(error.meta?.target ?? "");

    if (target.includes("Vehicle_one_active_primary_per_user")) {
      return "primary_conflict";
    }

    if (target.includes("Vehicle_user_active_plate_key")) {
      return "duplicate_plate";
    }

    return fallback;
  }

  return "failed";
}

function logGarageFailure(
  userId: string,
  operation: string,
  error: unknown,
  vehicleId?: string,
) {
  console.warn("GARAGE_OPERATION_FAILED", {
    userId,
    vehicleId,
    operation,
    errorCode: safeErrorCode(error),
  });
}

function safeErrorCode(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code;
  }

  if (error instanceof Error) {
    return error.name;
  }

  return "UNKNOWN";
}

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}
