import Link from "next/link";
import {
  GarageVehicleLifecycle,
  type GarageLifecycleVehicle,
} from "@/components/garage-vehicle-lifecycle";
import { requireCompleteMemberUser } from "@/lib/member-access";
import { prisma } from "@/lib/prisma";
import { measureServerTiming } from "@/lib/server-timing";
import { calculateVehiclePerformanceRating } from "@/lib/vehicle-performance-rating";
import { createOwnedVehicleImageSignedUrl } from "@/lib/vehicle-images";

type GaragePageProps = {
  searchParams: Promise<{
    garage?: string;
    garageError?: string;
  }>;
};

const vehicleDefinitionRatingSelect = {
  id: true,
  powerRating: true,
  handlingRating: true,
  brakingRating: true,
  reliabilityRating: true,
  thermalRating: true,
  trackReadinessRating: true,
  weightPenalty: true,
  ratingStatus: true,
} as const;

const vehicleRatingModificationSelect = {
  modificationDefinition: {
    select: {
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
} as const;

export default async function GaragePage({ searchParams }: GaragePageProps) {
  const [memberUser, params] = await Promise.all([
    requireCompleteMemberUser("/account/garage"),
    searchParams,
  ]);
  const vehicleSelect = {
    id: true,
    userId: true,
    vehicleDefinitionId: true,
    vehicleDefinition: {
      select: vehicleDefinitionRatingSelect,
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
      select: vehicleRatingModificationSelect,
    },
  } as const;
  const [activeVehicles, archivedVehicles] = await measureServerTiming(
    "GARAGE_QUERY",
    () =>
      Promise.all([
        prisma.vehicle.findMany({
          where: {
            userId: memberUser.id,
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
          select: vehicleSelect,
        }),
        prisma.vehicle.findMany({
          where: {
            userId: memberUser.id,
            deletedAt: {
              not: null,
            },
          },
          orderBy: {
            deletedAt: "desc",
          },
          select: vehicleSelect,
        }),
      ]),
  );
  const activeVehicleCards = await measureServerTiming("GARAGE_SIGNED_URLS", () =>
    Promise.all(
      activeVehicles.map(async (vehicle) => ({
        ...vehicle,
        coverImageUrl: await createOwnedVehicleImageSignedUrl(vehicle, memberUser.id),
      })),
    ),
  );
  const archivedVehicleCards = archivedVehicles.map((vehicle) => ({
    ...vehicle,
    coverImageUrl: null,
  }));
  const activeLifecycleVehicles = activeVehicleCards.map(toGarageLifecycleVehicle);
  const archivedLifecycleVehicles = archivedVehicleCards.map(toGarageLifecycleVehicle);

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-10 lg:py-24">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-ats-blue">
            Dijital garaj
          </p>
          <h1 className="mt-5 text-5xl font-black leading-none text-ats-text sm:text-7xl">
            Garajım
          </h1>
          <p className="mt-6 text-base leading-7 text-ats-muted sm:text-lg sm:leading-8">
            Üyelik hesabınıza ait araçları yönetin. Etkinlik kayıtları bu
            sprintte garaj araçlarına bağlanmaz.
          </p>
        </div>
        <Link
          href="/account/garage/new"
          className="inline-flex h-12 items-center justify-center rounded-full bg-ats-blue px-6 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover focus:outline-none focus:ring-2 focus:ring-ats-blue/40"
        >
          Araç ekle
        </Link>
      </div>

      <GarageMessage garage={params.garage} garageError={params.garageError} />

      <GarageVehicleLifecycle
        activeVehicles={activeLifecycleVehicles}
        archivedVehicles={archivedLifecycleVehicles}
      />
    </section>
  );
}

function toGarageLifecycleVehicle(vehicle: {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  plateNumber: string;
  color: string | null;
  isPrimary: boolean;
  coverImageUrl: string | null;
  vehicleDefinition: Parameters<typeof calculateVehiclePerformanceRating>[0]["vehicleDefinition"];
  modifications: Parameters<typeof calculateVehiclePerformanceRating>[0]["installedModifications"];
}): GarageLifecycleVehicle {
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
    coverImageUrl: vehicle.coverImageUrl,
    rating: rating
      ? {
          overall: rating.overall,
          status: rating.status,
        }
      : null,
  };
}

function GarageMessage({
  garage,
  garageError,
}: {
  garage?: string;
  garageError?: string;
}) {
  const success = successMessage(garage);
  const error = errorMessage(garageError);

  if (!success && !error) {
    return null;
  }

  return (
    <div className="mt-8 space-y-3">
      {success ? (
        <p className="rounded-md border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function successMessage(value?: string) {
  if (value === "created") {
    return "Araç garajınıza eklendi.";
  }

  if (value === "updated") {
    return "Araç bilgileri güncellendi.";
  }

  if (value === "primary") {
    return "Birincil aracınız güncellendi.";
  }

  if (value === "archived") {
    return "Araç arşivlendi.";
  }

  if (value === "archived_batch") {
    return "Seçilen araçlar arşivlendi.";
  }

  if (value === "restored") {
    return "Araç geri yüklendi.";
  }

  if (value === "deleted") {
    return "Araç kalıcı olarak silindi. Geçmiş etkinlik kayıtları korundu.";
  }

  if (value === "deleted_batch") {
    return "Seçilen araçlar kalıcı olarak silindi. Geçmiş etkinlik kayıtları korundu.";
  }

  if (value === "image_uploaded") {
    return "Araç fotoğrafı eklendi.";
  }

  if (value === "image_replaced") {
    return "Araç fotoğrafı güncellendi.";
  }

  if (value === "image_removed") {
    return "Araç fotoğrafı kaldırıldı.";
  }

  return null;
}

function errorMessage(value?: string) {
  if (value === "duplicate_plate") {
    return "Bu plaka ile aktif bir araç garajınızda zaten bulunuyor.";
  }

  if (value === "restore_conflict") {
    return "Bu araç geri yüklenemedi. Aynı plakaya sahip aktif bir araç olabilir.";
  }

  if (value === "not_found") {
    return "Araç bulunamadı veya bu işlem için uygun değil.";
  }

  if (value === "archive_failed") {
    return "Araç arşivlenemedi. Lütfen tekrar deneyin.";
  }

  if (value === "batch_empty") {
    return "İşlem için en az bir araç seçin.";
  }

  if (value === "batch_too_large") {
    return "Tek seferde en fazla 50 araç seçilebilir.";
  }

  if (value === "delete_failed") {
    return "Araç kalıcı olarak silinemedi. Lütfen tekrar deneyin.";
  }

  if (value === "active_delete_forbidden") {
    return "Aktif araçlar kalıcı olarak silinemez. Önce arşivleyin.";
  }

  if (value === "confirmation_required") {
    return "Kalıcı silme için onayı işaretleyin.";
  }

  if (value === "primary_conflict") {
    return "Birincil araç güncellenemedi. Lütfen sayfayı yenileyip tekrar deneyin.";
  }

  if (value === "unsupported_format") {
    return "Araç fotoğrafı JPEG, PNG veya WebP formatında olmalı.";
  }

  if (value === "file_too_large") {
    return "Araç fotoğrafı en fazla 8 MB olabilir.";
  }

  if (value === "storage_unavailable") {
    return "Fotoğraf depolama servisine şu anda ulaşılamıyor.";
  }

  if (value === "upload_failed") {
    return "Araç fotoğrafı yüklenemedi. Lütfen tekrar deneyin.";
  }

  if (value === "remove_failed") {
    return "Araç fotoğrafı kaldırılamadı. Lütfen tekrar deneyin.";
  }

  if (value) {
    return "İşlem tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.";
  }

  return null;
}
