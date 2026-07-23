import Link from "next/link";
import { createVehicleAction } from "@/app/account/garage/actions";
import { VehicleForm } from "@/components/vehicle-form";
import {
  MAX_ACTIVE_GARAGE_VEHICLES,
  canAddActiveVehicle,
  getRemainingActiveVehicleSlots,
} from "@/lib/garage-capacity";
import { requireCompleteMemberUser } from "@/lib/member-access";
import { normalizeMemberReturnTo } from "@/lib/member-auth";
import { prisma } from "@/lib/prisma";

type NewVehiclePageProps = {
  searchParams: Promise<{
    garageError?: string;
    returnTo?: string;
  }>;
};

export default async function NewVehiclePage({ searchParams }: NewVehiclePageProps) {
  const memberUser = await requireCompleteMemberUser("/account/garage/new");
  const [params, activeVehicleCount] = await Promise.all([
    searchParams,
    prisma.vehicle.count({
      where: {
        userId: memberUser.id,
        deletedAt: null,
      },
    }),
  ]);
  const returnTo = params.returnTo
    ? normalizeMemberReturnTo(params.returnTo)
    : "/account/garage";
  const activeSlotsRemaining = getRemainingActiveVehicleSlots(activeVehicleCount);

  if (!canAddActiveVehicle(activeVehicleCount)) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mb-10 max-w-3xl">
          <Link
            href="/account/garage"
            className="text-xs font-black uppercase tracking-[0.16em] text-ats-muted transition hover:text-ats-blue"
          >
            ← Garaja dön
          </Link>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.22em] text-ats-blue">
            Dijital garaj
          </p>
          <h1 className="mt-5 text-5xl font-black leading-none text-ats-text sm:text-7xl">
            Araç ekle
          </h1>
        </div>

        <div className="rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft">
          <p className="text-xl font-black text-ats-text">
            Aktif araç kapasiteniz dolu.
          </p>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-ats-muted">
            Garajınızda en fazla {MAX_ACTIVE_GARAGE_VEHICLES} aktif araç
            bulunabilir. Yeni araç eklemek için mevcut araçlardan birini
            arşivleyin.
          </p>
          <p className="mt-4 text-sm font-black text-ats-text">
            Aktif araçlar: {activeVehicleCount} / {MAX_ACTIVE_GARAGE_VEHICLES}
          </p>
          <Link
            href="/account/garage"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-ats-blue px-5 text-xs font-black uppercase tracking-[0.12em] text-ats-black transition hover:bg-ats-blue-hover"
          >
            Garaja dön
          </Link>
        </div>
      </section>
    );
  }

  const vehicleDefinitions = await prisma.vehicleDefinition.findMany({
    where: {
      active: true,
    },
    orderBy: [
      {
        brand: "asc",
      },
      {
        model: "asc",
      },
      {
        sortOrder: "asc",
      },
    ],
    select: {
      id: true,
      code: true,
      brand: true,
      model: true,
      generation: true,
      chassisCode: true,
      variant: true,
      yearFrom: true,
      yearTo: true,
      engineFamily: {
        select: {
          name: true,
        },
      },
    },
  });

  return (
    <section className="mx-auto max-w-5xl px-6 py-16 sm:px-8 lg:px-10 lg:py-24">
      <div className="mb-10 max-w-3xl">
        <Link
          href="/account/garage"
          className="text-xs font-black uppercase tracking-[0.16em] text-ats-muted transition hover:text-ats-blue"
        >
          ← Garaja dön
        </Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.22em] text-ats-blue">
          Dijital garaj
        </p>
        <h1 className="mt-5 text-5xl font-black leading-none text-ats-text sm:text-7xl">
          Araç ekle
        </h1>
        <p className="mt-6 text-base leading-7 text-ats-muted sm:text-lg sm:leading-8">
          İlk aktif aracınız otomatik olarak birincil araç olur. Sonraki
          araçlarda birincil tercihinizi ayrıca belirleyebilirsiniz.
        </p>
      </div>

      <VehicleErrorMessage garageError={params.garageError} />

      <p className="mb-5 rounded-md border border-ats-border bg-ats-surface px-4 py-3 text-sm font-black text-ats-text">
        Aktif araçlar: {activeVehicleCount} / {MAX_ACTIVE_GARAGE_VEHICLES} ·{" "}
        Kalan slot: {activeSlotsRemaining}
      </p>

      <VehicleForm
        action={createVehicleAction}
        submitLabel="Aracı Kaydet"
        pendingSubmitLabel="Araç ekleniyor..."
        showPrimaryOption
        returnTo={returnTo}
        vehicleDefinitions={vehicleDefinitions}
        templateDefaultMode="catalog"
      />
    </section>
  );
}

function VehicleErrorMessage({ garageError }: { garageError?: string }) {
  const message = errorMessage(garageError);

  if (!message) {
    return null;
  }

  return (
    <p className="mb-5 rounded-md border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
      {message}
    </p>
  );
}

function errorMessage(value?: string) {
  if (value === "active_vehicle_limit_reached") {
    return "Garaj kapasiteniz dolu.";
  }

  if (value === "duplicate_plate") {
    return "Bu plaka ile aktif bir araç garajınızda zaten bulunuyor.";
  }

  if (value === "invalid") {
    return "Lütfen marka, model, plaka ve opsiyonel alanları kontrol edin.";
  }

  if (value) {
    return "Araç eklenemedi. Lütfen tekrar deneyin.";
  }

  return null;
}
