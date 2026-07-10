import Link from "next/link";
import { redirect } from "next/navigation";
import {
  archiveVehicleAction,
  makePrimaryVehicleAction,
  updateVehicleAction,
} from "@/app/account/garage/actions";
import { VehicleForm } from "@/components/vehicle-form";
import { requireCompleteMemberUser } from "@/lib/member-access";
import { prisma } from "@/lib/prisma";

type EditVehiclePageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    garageError?: string;
  }>;
};

export default async function EditVehiclePage({
  params,
  searchParams,
}: EditVehiclePageProps) {
  const { id } = await params;
  const memberUser = await requireCompleteMemberUser(`/account/garage/${id}`);
  const query = await searchParams;
  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id,
      userId: memberUser.id,
      deletedAt: null,
    },
  });

  if (!vehicle) {
    redirect("/account/garage?garageError=not_found");
  }

  const updateAction = updateVehicleAction.bind(null, vehicle.id);
  const makePrimaryAction = makePrimaryVehicleAction.bind(null, vehicle.id);
  const archiveAction = archiveVehicleAction.bind(null, vehicle.id);

  return (
    <section className="mx-auto max-w-5xl px-6 py-16 sm:px-8 lg:px-10 lg:py-24">
      <div className="mb-10 max-w-3xl">
        <Link
          href="/account/garage"
          className="text-xs font-black uppercase tracking-[0.16em] text-ats-muted transition hover:text-ats-blue"
        >
          Garaja dön
        </Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.22em] text-ats-blue">
          Dijital garaj
        </p>
        <h1 className="mt-5 text-5xl font-black leading-none text-ats-text sm:text-7xl">
          Aracı düzenle
        </h1>
        <p className="mt-6 text-base leading-7 text-ats-muted sm:text-lg sm:leading-8">
          {vehicle.brand} {vehicle.model} · {vehicle.plateNumber}
        </p>
      </div>

      <VehicleErrorMessage garageError={query.garageError} />

      <VehicleForm
        action={updateAction}
        submitLabel="Değişiklikleri Kaydet"
        vehicle={vehicle}
      />

      <div className="mt-6 flex flex-wrap gap-3 rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft">
        {!vehicle.isPrimary ? (
          <form action={makePrimaryAction}>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-full border border-ats-blue/50 px-5 text-xs font-black uppercase tracking-[0.12em] text-ats-blue transition hover:bg-ats-blue hover:text-ats-black"
            >
              Birincil araç yap
            </button>
          </form>
        ) : (
          <span className="inline-flex h-11 items-center justify-center rounded-full border border-ats-blue/40 bg-ats-blue/10 px-5 text-xs font-black uppercase tracking-[0.12em] text-ats-blue">
            Birincil araç
          </span>
        )}
        <form action={archiveAction}>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-full border border-ats-border px-5 text-xs font-black uppercase tracking-[0.12em] text-ats-muted transition hover:border-red-300/60 hover:text-red-100"
          >
            Aracı arşivle
          </button>
        </form>
      </div>
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
  if (value === "duplicate_plate") {
    return "Bu plaka ile aktif bir araç garajınızda zaten bulunuyor.";
  }

  if (value === "invalid") {
    return "Lütfen marka, model, plaka ve opsiyonel alanları kontrol edin.";
  }

  if (value === "primary_conflict") {
    return "Birincil araç güncellenemedi. Lütfen tekrar deneyin.";
  }

  if (value) {
    return "Araç güncellenemedi. Lütfen tekrar deneyin.";
  }

  return null;
}
