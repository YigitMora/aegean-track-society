import Link from "next/link";
import { redirect } from "next/navigation";
import {
  archiveVehicleAction,
  makePrimaryVehicleAction,
  removeVehicleImageAction,
  uploadVehicleImageAction,
  updateVehicleAction,
} from "@/app/account/garage/actions";
import { VehicleForm } from "@/components/vehicle-form";
import { VehicleImageSubmitButton } from "@/components/vehicle-image-submit-button";
import { requireCompleteMemberUser } from "@/lib/member-access";
import { prisma } from "@/lib/prisma";
import { createOwnedVehicleImageSignedUrl } from "@/lib/vehicle-images";

type EditVehiclePageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    garage?: string;
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

  const coverImageUrl = await createOwnedVehicleImageSignedUrl(vehicle, memberUser.id);
  const updateAction = updateVehicleAction.bind(null, vehicle.id);
  const makePrimaryAction = makePrimaryVehicleAction.bind(null, vehicle.id);
  const archiveAction = archiveVehicleAction.bind(null, vehicle.id);
  const uploadImageAction = uploadVehicleImageAction.bind(null, vehicle.id);
  const removeImageAction = removeVehicleImageAction.bind(null, vehicle.id);

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

      <VehicleMessage garage={query.garage} garageError={query.garageError} />

      <VehicleCoverPanel
        action={uploadImageAction}
        removeAction={removeImageAction}
        coverImageUrl={coverImageUrl}
        hasImage={Boolean(vehicle.imagePath)}
        label={`${vehicle.brand} ${vehicle.model}`}
      />

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

function VehicleCoverPanel({
  action,
  removeAction,
  coverImageUrl,
  hasImage,
  label,
}: {
  action: (formData: FormData) => void | Promise<void>;
  removeAction: () => void | Promise<void>;
  coverImageUrl: string | null;
  hasImage: boolean;
  label: string;
}) {
  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-ats-border bg-ats-surface shadow-soft">
      <div className="relative aspect-[16/9] overflow-hidden bg-ats-black sm:aspect-[21/9]">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={`${label} araç fotoğrafı`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(76,201,240,0.16),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] px-6 text-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-ats-blue">
                Aegean Track Society
              </p>
              <p className="mt-3 text-lg font-black text-ats-text">Araç fotoğrafı</p>
              <p className="mt-2 text-sm font-semibold text-ats-muted">
                Garaj kartınız için isteğe bağlı kapak fotoğrafı ekleyin.
              </p>
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ats-black/70 to-transparent" />
      </div>

      <div className="grid gap-5 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <form action={action} className="space-y-4">
          <div>
            <label
              htmlFor="vehicle-cover-image"
              className="text-sm font-black text-ats-text"
            >
              Araç fotoğrafı
            </label>
            <p className="mt-2 text-sm font-semibold leading-6 text-ats-muted">
              JPEG, PNG veya WebP · En fazla 8 MB
            </p>
            <input
              id="vehicle-cover-image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              className="mt-4 block w-full cursor-pointer rounded-md border border-ats-border bg-ats-black text-sm font-semibold text-ats-muted file:mr-4 file:h-11 file:cursor-pointer file:border-0 file:bg-ats-blue file:px-5 file:text-sm file:font-black file:text-ats-black hover:file:bg-ats-blue-hover focus:outline-none focus:ring-2 focus:ring-ats-blue/30"
            />
          </div>
          <VehicleImageSubmitButton pendingLabel="Fotoğraf yükleniyor...">
            {hasImage ? "Fotoğrafı değiştir" : "Fotoğraf ekle"}
          </VehicleImageSubmitButton>
        </form>

        {hasImage ? (
          <form action={removeAction}>
            <VehicleImageSubmitButton
              pendingLabel="Fotoğraf kaldırılıyor..."
              variant="danger"
            >
              Fotoğrafı kaldır
            </VehicleImageSubmitButton>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function VehicleMessage({
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
    <div className="mb-5 space-y-3">
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

  if (value === "invalid") {
    return "Lütfen marka, model, plaka ve opsiyonel alanları kontrol edin.";
  }

  if (value === "primary_conflict") {
    return "Birincil araç güncellenemedi. Lütfen tekrar deneyin.";
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
    return "Araç güncellenemedi. Lütfen tekrar deneyin.";
  }

  return null;
}
