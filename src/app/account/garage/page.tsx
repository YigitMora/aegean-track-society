import Link from "next/link";
import type { ModificationCategory, VehicleRatingStatus } from "@prisma/client";
import {
  archiveVehicleAction,
  makePrimaryVehicleAction,
  restoreVehicleAction,
} from "@/app/account/garage/actions";
import { VehicleRatingCard } from "@/components/vehicle-rating-card";
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

      {activeVehicleCards.length > 0 ? (
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {activeVehicleCards.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-lg border border-ats-border bg-ats-surface p-8 shadow-soft">
          <p className="text-2xl font-black text-ats-text">Garajınız henüz boş.</p>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-ats-muted">
            İlk aracınızı eklediğinizde otomatik olarak birincil aracınız olur.
          </p>
          <Link
            href="/account/garage/new"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-ats-blue px-6 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover"
          >
            İlk aracımı ekle
          </Link>
        </div>
      )}

      {archivedVehicleCards.length > 0 ? (
        <section className="mt-16 border-t border-ats-border pt-10">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ats-muted">
              Arşiv
            </p>
            <h2 className="mt-3 text-3xl font-black text-ats-text">
              Arşivlenen araçlar
            </h2>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {archivedVehicleCards.map((vehicle) => (
              <ArchivedVehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function VehicleCoverPreview({
  coverImageUrl,
  label,
}: {
  coverImageUrl: string | null;
  label: string;
}) {
  return (
    <div className="relative aspect-[16/9] overflow-hidden bg-ats-black">
      {coverImageUrl ? (
        <>
          <img
            src={coverImageUrl}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-2xl"
          />
          <div className="absolute inset-0 bg-ats-black/55" />
          <img
            src={coverImageUrl}
            alt={`${label} araç fotoğrafı`}
            loading="lazy"
            decoding="async"
            className="relative z-10 h-full w-full object-contain p-2 sm:p-3"
          />
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(76,201,240,0.16),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))]">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-ats-blue">
              Aegean Track Society
            </p>
            <p className="mt-2 text-sm font-semibold text-ats-muted">
              Araç fotoğrafı eklenmedi
            </p>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-20 bg-gradient-to-t from-ats-black/55 to-transparent" />
    </div>
  );
}

function VehicleCard({
  vehicle,
}: {
  vehicle: {
    id: string;
    brand: string;
    model: string;
    year: number | null;
    plateNumber: string;
    color: string | null;
    isPrimary: boolean;
    coverImageUrl: string | null;
    vehicleDefinition: {
      id: string;
      powerRating: number;
      handlingRating: number;
      brakingRating: number;
      reliabilityRating: number;
      thermalRating: number;
      trackReadinessRating: number;
      weightPenalty: number;
      ratingStatus: VehicleRatingStatus;
    } | null;
    modifications: Array<{
      modificationDefinition: {
        code: string;
        category: ModificationCategory;
        powerImpact: number;
        handlingImpact: number;
        brakingImpact: number;
        reliabilityImpact: number;
        trackReadinessImpact: number;
        modificationImpacts: Array<{
          vehicleDefinitionId: string;
          powerImpact: number;
          handlingImpact: number;
          brakingImpact: number;
          reliabilityImpact: number;
          thermalImpact: number;
          trackReadinessImpact: number;
          active: boolean;
        }>;
      };
    }>;
  };
}) {
  const makePrimaryAction = makePrimaryVehicleAction.bind(null, vehicle.id);
  const archiveAction = archiveVehicleAction.bind(null, vehicle.id);
  const rating = calculateVehiclePerformanceRating({
    vehicleDefinition: vehicle.vehicleDefinition,
    installedModifications: vehicle.modifications,
  });

  return (
    <article className="overflow-hidden rounded-lg border border-ats-border bg-ats-surface shadow-soft">
      <VehicleCoverPreview
        coverImageUrl={vehicle.coverImageUrl}
        label={`${vehicle.brand} ${vehicle.model}`}
      />
      <div className="flex flex-wrap items-start justify-between gap-4 p-6 pb-0">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ats-muted">
            {vehicle.plateNumber}
          </p>
          <h2 className="mt-3 text-3xl font-black text-ats-text">
            {vehicle.brand} {vehicle.model}
          </h2>
          <p className="mt-3 text-sm font-semibold text-ats-muted">
            {[vehicle.year, vehicle.color].filter(Boolean).join(" · ") || "Detay eklenmedi"}
          </p>
        </div>
        {vehicle.isPrimary ? (
          <span className="rounded-full border border-ats-blue/40 bg-ats-blue/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-ats-blue">
            Birincil
          </span>
        ) : null}
      </div>

      <VehicleRatingCard rating={rating} compact className="mx-6 mt-5" />

      <div className="flex flex-wrap gap-3 p-6">
        <Link
          href={`/account/garage/${vehicle.id}`}
          className="inline-flex h-11 items-center justify-center rounded-full border border-ats-border px-5 text-xs font-black uppercase tracking-[0.12em] text-ats-text transition hover:border-ats-blue hover:text-ats-blue"
        >
          Aracı düzenle
        </Link>
        {!vehicle.isPrimary ? (
          <form action={makePrimaryAction}>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-full border border-ats-blue/50 px-5 text-xs font-black uppercase tracking-[0.12em] text-ats-blue transition hover:bg-ats-blue hover:text-ats-black"
            >
              Birincil araç yap
            </button>
          </form>
        ) : null}
        <form action={archiveAction}>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-full border border-ats-border px-5 text-xs font-black uppercase tracking-[0.12em] text-ats-muted transition hover:border-red-300/60 hover:text-red-100"
          >
            Aracı arşivle
          </button>
        </form>
      </div>
    </article>
  );
}

function ArchivedVehicleCard({
  vehicle,
}: {
  vehicle: {
    id: string;
    brand: string;
    model: string;
    year: number | null;
    plateNumber: string;
    color: string | null;
    coverImageUrl: string | null;
  };
}) {
  const restoreAction = restoreVehicleAction.bind(null, vehicle.id);

  return (
    <article className="overflow-hidden rounded-lg border border-ats-border bg-ats-black">
      <VehicleCoverPreview
        coverImageUrl={vehicle.coverImageUrl}
        label={`${vehicle.brand} ${vehicle.model}`}
      />
      <div className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ats-muted">
            {vehicle.plateNumber}
          </p>
          <h3 className="mt-2 text-xl font-black text-ats-text">
            {vehicle.brand} {vehicle.model}
          </h3>
          <p className="mt-2 text-xs font-semibold text-ats-muted">
            {[vehicle.year, vehicle.color].filter(Boolean).join(" · ") || "Arşivde"}
          </p>
        </div>
        <form action={restoreAction}>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-full border border-ats-border px-4 text-xs font-black uppercase tracking-[0.12em] text-ats-text transition hover:border-ats-blue hover:text-ats-blue"
          >
            Aracı geri yükle
          </button>
        </form>
      </div>
    </article>
  );
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

  if (value === "restored") {
    return "Araç geri yüklendi.";
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
