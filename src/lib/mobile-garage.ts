import "server-only";

import type { Prisma } from "@prisma/client";
import {
  getRemainingActiveVehicleSlots,
  MAX_ACTIVE_GARAGE_VEHICLES,
} from "@/lib/garage-capacity";
import { createGarageVehicle } from "@/lib/garage-service";
import {
  buildMobileGarageCreateResponseBody,
  buildMobileGarageResponseBody,
  buildMobileVehicleDefinitionsResponseBody,
  MobileGarageError,
  parseMobileGarageVehicleBody,
  type MobileGarageVehicle,
  type MobileVehicleDefinition,
} from "@/lib/mobile-garage-contract";
import { prisma } from "@/lib/prisma";
import { calculateVehiclePerformanceRating } from "@/lib/vehicle-performance-rating";
import { createOwnedVehicleImageSignedUrl } from "@/lib/vehicle-images";

const mobileVehicleDefinitionRatingSelect = {
  id: true,
  powerRating: true,
  handlingRating: true,
  brakingRating: true,
  reliabilityRating: true,
  thermalRating: true,
  trackReadinessRating: true,
  weightPenalty: true,
  ratingStatus: true,
} satisfies Prisma.VehicleDefinitionSelect;

const mobileVehicleRatingModificationSelect = {
  modificationDefinitionId: true,
  modificationDefinition: {
    select: {
      id: true,
      code: true,
      category: true,
      powerImpact: true,
      handlingImpact: true,
      brakingImpact: true,
      reliabilityImpact: true,
      trackReadinessImpact: true,
      modificationImpacts: {
        where: {
          active: true,
        },
        select: {
          vehicleDefinitionId: true,
          powerImpact: true,
          handlingImpact: true,
          brakingImpact: true,
          reliabilityImpact: true,
          thermalImpact: true,
          trackReadinessImpact: true,
          active: true,
        },
      },
    },
  },
} satisfies Prisma.VehicleModificationSelect;

const mobileGarageVehicleSelect = {
  id: true,
  userId: true,
  vehicleDefinitionId: true,
  vehicleDefinition: {
    select: mobileVehicleDefinitionRatingSelect,
  },
  brand: true,
  model: true,
  year: true,
  plateNumber: true,
  color: true,
  isPrimary: true,
  imagePath: true,
  deletedAt: true,
  modifications: {
    where: {
      deletedAt: null,
    },
    select: mobileVehicleRatingModificationSelect,
  },
  catalogMatchRequests: {
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],
    take: 1,
    select: {
      status: true,
    },
  },
} satisfies Prisma.VehicleSelect;

const mobileVehicleDefinitionSelect = {
  id: true,
  brand: true,
  model: true,
  generation: true,
  chassisCode: true,
  variant: true,
  yearFrom: true,
  yearTo: true,
  powertrain: true,
  drivetrain: true,
  ratingStatus: true,
} satisfies Prisma.VehicleDefinitionSelect;

type MobileGarageVehicleRow = Prisma.VehicleGetPayload<{
  select: typeof mobileGarageVehicleSelect;
}>;

type MobileVehicleDefinitionRow = Prisma.VehicleDefinitionGetPayload<{
  select: typeof mobileVehicleDefinitionSelect;
}>;

export async function getMobileGarageResponseBody(
  memberUserId: string,
  accessToken: string,
) {
  const vehicles = await prisma.vehicle.findMany({
    where: {
      userId: memberUserId,
      deletedAt: null,
    },
    orderBy: [
      {
        isPrimary: "desc",
      },
      {
        createdAt: "asc",
      },
      {
        id: "asc",
      },
    ],
    select: mobileGarageVehicleSelect,
  });
  const mobileVehicles = await Promise.all(
    vehicles.map((vehicle) =>
      serializeMobileGarageVehicle(vehicle, memberUserId, accessToken),
    ),
  );

  return buildMobileGarageResponseBody({
    active: vehicles.length,
    max: MAX_ACTIVE_GARAGE_VEHICLES,
    remaining: getRemainingActiveVehicleSlots(vehicles.length),
    vehicles: mobileVehicles,
  });
}

export async function getMobileVehicleDefinitionsResponseBody() {
  const definitions = await prisma.vehicleDefinition.findMany({
    where: {
      active: true,
    },
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        brand: "asc",
      },
      {
        model: "asc",
      },
      {
        generation: "asc",
      },
      {
        variant: "asc",
      },
      {
        id: "asc",
      },
    ],
    select: mobileVehicleDefinitionSelect,
  });

  return buildMobileVehicleDefinitionsResponseBody(
    definitions.map(serializeMobileVehicleDefinition),
  );
}

export async function createMobileGarageVehicle({
  memberUserId,
  body,
}: {
  memberUserId: string;
  body: unknown;
}) {
  const input = parseMobileGarageVehicleBody(body);

  if (!input) {
    throw new MobileGarageError("MOBILE_GARAGE_INVALID_BODY");
  }

  const result = await createGarageVehicle({
    targetUserId: memberUserId,
    input,
  });

  if (result.ok) {
    return buildMobileGarageCreateResponseBody(result.vehicleId);
  }

  if (result.code === "invalid") {
    throw new MobileGarageError("MOBILE_GARAGE_INVALID_BODY");
  }

  if (result.code === "duplicate_plate") {
    throw new MobileGarageError("MOBILE_GARAGE_DUPLICATE_PLATE");
  }

  if (result.code === "active_vehicle_limit_reached") {
    throw new MobileGarageError("MOBILE_GARAGE_CAPACITY_REACHED");
  }

  throw new MobileGarageError("MOBILE_GARAGE_CREATE_FAILED");
}

async function serializeMobileGarageVehicle(
  vehicle: MobileGarageVehicleRow,
  memberUserId: string,
  accessToken: string,
): Promise<MobileGarageVehicle> {
  const rating = calculateVehiclePerformanceRating({
    vehicleDefinition: vehicle.vehicleDefinition,
    installedModifications: vehicle.modifications,
  });

  return {
    id: vehicle.id,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    plateNumber: vehicle.plateNumber,
    color: vehicle.color,
    isPrimary: vehicle.isPrimary,
    coverImageUrl: await createMobileVehicleCoverImageUrl(
      vehicle,
      memberUserId,
      accessToken,
    ),
    vehicleDefinitionId: vehicle.vehicleDefinitionId,
    modificationCount: vehicle.modifications.length,
    latestCatalogMatchRequestStatus:
      vehicle.catalogMatchRequests[0]?.status ?? null,
    atsRating: rating
      ? {
          overall: rating.overall,
          power: rating.power,
          handling: rating.handling,
          braking: rating.braking,
          reliability: rating.reliability,
          thermal: rating.thermal,
          trackReadiness: rating.trackReadiness,
          status: rating.status,
        }
      : null,
  };
}

async function createMobileVehicleCoverImageUrl(
  vehicle: MobileGarageVehicleRow,
  memberUserId: string,
  accessToken: string,
) {
  try {
    return await createOwnedVehicleImageSignedUrl(vehicle, memberUserId, {
      accessToken,
    });
  } catch {
    console.warn("MOBILE_GARAGE_IMAGE_SIGN_FAILED");
    return null;
  }
}

function serializeMobileVehicleDefinition(
  definition: MobileVehicleDefinitionRow,
): MobileVehicleDefinition {
  return {
    id: definition.id,
    brand: definition.brand,
    model: definition.model,
    generation: definition.generation,
    chassisCode: definition.chassisCode,
    variant: definition.variant,
    yearFrom: definition.yearFrom,
    yearTo: definition.yearTo,
    powertrain: definition.powertrain,
    drivetrain: definition.drivetrain,
    ratingStatus: definition.ratingStatus,
  };
}
