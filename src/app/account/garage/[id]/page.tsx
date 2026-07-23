import Link from "next/link";
import { Prisma, type VehiclePowertrain } from "@prisma/client";
import { redirect } from "next/navigation";
import {
  addVehicleModificationsBatchAction,
  archiveVehicleAction,
  makePrimaryVehicleAction,
  previewVehicleModificationsRatingAction,
  removeVehicleModificationAction,
  removeVehicleImageAction,
  unlinkVehicleDefinitionAction,
  uploadVehicleImageAction,
  updateVehicleAction,
} from "@/app/account/garage/actions";
import { VehicleForm } from "@/components/vehicle-form";
import {
  VehicleModificationBatchSelector,
  type ModificationCatalogGroup,
} from "@/components/vehicle-modification-batch-selector";
import { VehiclePerformanceRatingCard } from "@/components/vehicle-rating-card";
import { VehicleImageSubmitButton } from "@/components/vehicle-image-submit-button";
import { getRecentCatalogMatchCompletionNotices } from "@/lib/catalog-match-requests";
import { requireCompleteMemberUser } from "@/lib/member-access";
import {
  concreteModificationRequiredMessage,
  isLegacyGenericModificationDefinition,
  isSelectableModificationLeaf,
  legacyModificationWarning,
  missingModificationSupportGroups,
  modificationManufacturerLabel,
  modificationRecommendationGroups,
  modificationSupportAdvisoryMessage,
} from "@/lib/modification-catalog-metadata";
import {
  modificationTypeKey,
  modificationTypeLabel,
} from "@/lib/modification-presentation";
import { prisma } from "@/lib/prisma";
import { measureServerTiming } from "@/lib/server-timing";
import {
  evaluateModificationAvailability,
  formatModificationDefinition,
  hasNamedProviderEcuTuneForVehicle,
  hasNamedProviderTurboForVehicle,
  isGenericEcuFallbackDefinition,
  isGenericTurboFallbackDefinition,
  modificationCategoryLabels,
  orderedModificationCategories,
  vehicleBuildResultLabel,
} from "@/lib/vehicle-build-rules";
import { createOwnedVehicleImageSignedUrl } from "@/lib/vehicle-images";
import { calculateVehiclePerformanceRating } from "@/lib/vehicle-performance-rating";
import {
  tyreProductModelLabel,
  tyreRoadUseLabel,
  tyreSurfaceIntentLabel,
  tyreTreadwearLabel,
  visibleTyreClassBadgeLabel,
  visibleTyreClassForDefinition,
  visibleTyreClassLabel,
} from "@/lib/tyre-catalog";

type EditVehiclePageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    build?: string;
    garage?: string;
    garageError?: string;
  }>;
};

export default async function EditVehiclePage({
  params,
  searchParams,
}: EditVehiclePageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const memberUser = await requireCompleteMemberUser(`/account/garage/${id}`);
  const vehicle = await measureServerTiming("GARAGE_QUERY", () =>
    prisma.vehicle.findFirst({
      where: {
        id,
        userId: memberUser.id,
        deletedAt: null,
      },
      select: {
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
            modificationDefinitionId: true,
            customNotes: true,
            installedAt: true,
            createdAt: true,
            modificationDefinition: {
              select: {
                id: true,
                code: true,
                category: true,
                brand: true,
                name: true,
                variant: true,
                componentTypeCode: true,
                usageClass: true,
                powerImpact: true,
                handlingImpact: true,
                brakingImpact: true,
                reliabilityImpact: true,
                trackReadinessImpact: true,
                modificationImpacts: {
                  where: {
                    active: true,
                  },
                  select: vehicleModificationImpactSelect,
                },
                compatibilities: {
                  where: {
                    active: true,
                  },
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  );

  if (!vehicle) {
    redirect("/account/garage?garageError=not_found");
  }

  const coverImageUrl = await measureServerTiming("GARAGE_SIGNED_URLS", () =>
    createOwnedVehicleImageSignedUrl(vehicle, memberUser.id),
  );
  const [catalog, vehicleDefinitions, completionNotices] = await Promise.all([
    prisma.modificationDefinition.findMany({
      where: {
        active: true,
      },
      orderBy: [
        {
          category: "asc",
        },
        {
          sortOrder: "asc",
        },
        {
          name: "asc",
        },
      ],
      select: modificationDefinitionRuleSelect,
    }),
    prisma.vehicleDefinition.findMany({
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
      select: vehicleDefinitionTemplateSelect,
    }),
    getRecentCatalogMatchCompletionNotices({
      userId: memberUser.id,
      vehicleId: vehicle.id,
      limit: 1,
    }),
  ]);
  const vehicleFormDefinitions = withCurrentVehicleDefinition(
    vehicleDefinitions,
    vehicle.vehicleDefinition,
  );
  const rating = calculateVehiclePerformanceRating({
    vehicleDefinition: vehicle.vehicleDefinition,
    installedModifications: vehicle.modifications,
  });
  const catalogGroups = buildCatalogGroups({
    catalog,
    vehicle,
    installedModifications: vehicle.modifications,
  });
  const updateAction = updateVehicleAction.bind(null, vehicle.id);
  const makePrimaryAction = makePrimaryVehicleAction.bind(null, vehicle.id);
  const archiveAction = archiveVehicleAction.bind(null, vehicle.id);
  const uploadImageAction = uploadVehicleImageAction.bind(null, vehicle.id);
  const removeImageAction = removeVehicleImageAction.bind(null, vehicle.id);
  const unlinkTemplateAction = unlinkVehicleDefinitionAction.bind(null, vehicle.id);
  const addBatchModificationAction = addVehicleModificationsBatchAction.bind(
    null,
    vehicle.id,
  );
  const previewRatingAction = previewVehicleModificationsRatingAction.bind(
    null,
    vehicle.id,
  );

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

      <CatalogCompletionNotice notices={completionNotices} />

      <VehicleMessage
        build={query.build}
        garage={query.garage}
        garageError={query.garageError}
      />

      <VehicleCoverPanel
        action={uploadImageAction}
        removeAction={removeImageAction}
        coverImageUrl={coverImageUrl}
        hasImage={Boolean(vehicle.imagePath)}
        label={`${vehicle.brand} ${vehicle.model}`}
      />

      <PlatformMatchPanel
        vehicleDefinition={vehicle.vehicleDefinition}
        suggestionCount={vehicleFormDefinitions.length}
        unlinkAction={unlinkTemplateAction}
      />

      <VehicleForm
        action={updateAction}
        submitLabel="Değişiklikleri Kaydet"
        vehicle={vehicle}
        vehicleDefinitions={vehicleFormDefinitions}
        templateDefaultMode={vehicle.vehicleDefinitionId ? "catalog" : "manual"}
      />

      <VehiclePerformanceRatingCard rating={rating} className="mt-6" />

      <VehicleBuildProfile
        addAction={addBatchModificationAction}
        previewAction={previewRatingAction}
        catalogGroups={catalogGroups}
        vehicleId={vehicle.id}
        vehicleDefinitionId={vehicle.vehicleDefinitionId}
        modifications={vehicle.modifications}
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

function PlatformMatchPanel({
  vehicleDefinition,
  suggestionCount,
  unlinkAction,
}: {
  vehicleDefinition: {
    brand: string;
    model: string;
    generation: string | null;
    chassisCode: string | null;
    variant: string | null;
    ratingStatus: string;
  } | null;
  suggestionCount: number;
  unlinkAction: () => void | Promise<void>;
}) {
  return (
    <section
      id="platform-match"
      className="mb-6 scroll-mt-24 rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft sm:p-8"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-ats-blue">
            Aracı platformla eşleştir
          </p>
          {vehicleDefinition ? (
            <>
              <h2 className="mt-3 text-2xl font-black text-ats-text">
                {vehicleDefinitionLabel(vehicleDefinition)}
              </h2>
              <p className="mt-2 text-sm font-semibold text-ats-muted">
                Rating durumu:{" "}
                {vehicleDefinition.ratingStatus === "CALIBRATED"
                  ? "Kalibre"
                  : "Geçici kalibrasyon"}
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-3 text-2xl font-black text-ats-text">
                Araç platformu henüz doğrulanmadı.
              </h2>
              <p className="mt-2 text-sm font-semibold text-ats-muted">
                {suggestionCount > 0
                  ? "Güvenli katalog eşleşmeleri formda seçilebilir."
                  : "Güvenli platform önerisi bulunamadı."}
              </p>
            </>
          )}
        </div>

        {vehicleDefinition ? (
          <form action={unlinkAction}>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-full border border-ats-border px-5 text-xs font-black uppercase tracking-[0.12em] text-ats-muted transition hover:border-red-300/60 hover:text-red-100"
            >
              Platform eşleşmesini kaldır
            </button>
          </form>
        ) : null}
      </div>
    </section>
  );
}

function VehicleBuildProfile({
  addAction,
  previewAction,
  catalogGroups,
  vehicleId,
  vehicleDefinitionId,
  modifications,
}: {
  addAction: Parameters<typeof VehicleModificationBatchSelector>[0]["action"];
  previewAction: Parameters<typeof VehicleModificationBatchSelector>[0]["previewAction"];
  catalogGroups: ModificationCatalogGroup[];
  vehicleId: string;
  vehicleDefinitionId: string | null;
  modifications: Array<{
    id: string;
    modificationDefinitionId: string;
    customNotes: string | null;
    installedAt: Date | null;
    createdAt: Date;
    modificationDefinition: {
      id: string;
      code: string;
      category: (typeof orderedModificationCategories)[number];
      brand: string | null;
      name: string;
      variant: string | null;
      componentTypeCode: string | null;
      usageClass: string | null;
      compatibilities: Array<{
        id: string;
      }>;
    };
  }>;
}) {
  return (
    <section
      id="build-profile"
      className="mt-6 scroll-mt-24 rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft sm:p-8"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-ats-blue">
            Araç Build Profili
          </p>
          <h2 className="mt-3 text-3xl font-black text-ats-text">
            Yüklü parçalar
          </h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-ats-muted">
            Modifikasyonlar güncel garaj verisidir; geçmiş başvurulardaki araç
            snapshotları değişmez.
          </p>
        </div>
        <span className="inline-flex h-9 items-center rounded-full border border-ats-blue/40 bg-ats-blue/10 px-3 text-xs font-black uppercase tracking-[0.12em] text-ats-blue">
          {modifications.length} parça
        </span>
      </div>

      {modifications.length === 0 ? (
        <p className="mt-6 rounded-md border border-ats-border bg-ats-black p-4 text-sm font-semibold text-ats-muted">
          Build profiline henüz parça eklenmedi.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {orderedModificationCategories.map((category) => {
            const categoryModifications = modifications.filter(
              (modification) =>
                modification.modificationDefinition.category === category,
            );

            if (categoryModifications.length === 0) {
              return null;
            }

            return (
              <div key={category} className="border-t border-ats-border pt-4 first:border-t-0 first:pt-0">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-ats-muted">
                  {modificationCategoryLabels[category]}
                </p>
                <div className="mt-2 divide-y divide-ats-border rounded-md border border-ats-border bg-ats-black">
                  {categoryModifications.map((modification) => {
                    const removeAction = removeVehicleModificationAction.bind(
                      null,
                      vehicleId,
                      modification.id,
                    );
                    const needsCompatibilityReview =
                      !vehicleDefinitionId &&
                      modification.modificationDefinition.compatibilities.length > 0;
                    const isLegacyGeneric =
                      isLegacyGenericModificationDefinition(
                        modification.modificationDefinition,
                      );

                    return (
                      <div
                        key={modification.id}
                        className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-ats-text">
                            {formatModificationDefinition(
                              modification.modificationDefinition,
                            )}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-ats-muted">
                            {modification.installedAt ? (
                              <span>Montaj: {formatDate(modification.installedAt)}</span>
                            ) : null}
                            {modification.customNotes ? (
                              <span className="break-words">{modification.customNotes}</span>
                            ) : null}
                            {needsCompatibilityReview ? (
                              <span className="font-black text-amber-200">
                                Uyumluluk yeniden doğrulanmalı
                              </span>
                            ) : null}
                            {isLegacyGeneric ? (
                              <span className="font-black text-amber-200">
                                {legacyModificationWarning(
                                  modification.modificationDefinition,
                                )}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <form action={removeAction}>
                          <input
                            type="hidden"
                            name="returnTo"
                            value={`/account/garage/${vehicleId}#build-profile`}
                          />
                          <button
                            type="submit"
                            className="inline-flex h-9 items-center justify-center rounded-full border border-red-300/40 px-3 text-xs font-black uppercase tracking-[0.12em] text-red-100 transition hover:bg-red-300 hover:text-ats-black"
                          >
                            Kaldır
                          </button>
                        </form>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 border-t border-ats-border pt-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-ats-blue">
          Hızlı Parça Ekle
        </p>
        {catalogGroups.length > 0 ? (
          <VehicleModificationBatchSelector
            action={addAction}
            previewAction={previewAction}
            catalogGroups={catalogGroups}
          />
        ) : (
          <p className="mt-4 rounded-md border border-ats-border bg-ats-black p-4 text-sm font-semibold text-ats-muted">
            Eklenebilir katalog parçası bulunamadı.
          </p>
        )}
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
              className="relative z-10 h-full w-full object-contain p-3 sm:p-5"
            />
          </>
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
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-ats-black/55 to-transparent" />
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

function CatalogCompletionNotice({
  notices,
}: {
  notices: Awaited<ReturnType<typeof getRecentCatalogMatchCompletionNotices>>;
}) {
  if (notices.length === 0) {
    return null;
  }

  return (
    <div className="mb-5 rounded-md border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold leading-6 text-emerald-100">
      <p className="font-black">Katalog eşleştirmeniz tamamlandı.</p>
      <p className="mt-1 text-emerald-100/85">
        Aracınız için ATS Rating ve uyumlu modifikasyon özellikleri artık
        kullanılabilir.
      </p>
      <Link
        href="#build-profile"
        className="mt-3 inline-flex h-10 items-center justify-center rounded-full border border-emerald-200/50 px-4 text-xs font-black uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-200 hover:text-ats-black"
      >
        Build Profilini Aç
      </Link>
    </div>
  );
}

function VehicleMessage({
  build,
  garage,
  garageError,
}: {
  build?: string;
  garage?: string;
  garageError?: string;
}) {
  const success = successMessage(garage) ?? buildMessage(build);
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
  if (value === "created") {
    return "Araç garajınıza eklendi.";
  }

  if (value === "duplicate_opened") {
    return "Bu araç zaten garajınızda. Mevcut araç kaydı açıldı.";
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

  if (value === "platform_unlinked") {
    return "Platform eşleşmesi kaldırıldı.";
  }

  return null;
}

function buildMessage(value?: string) {
  if (value === "modification_added") {
    return "Parça build profiline eklendi.";
  }

  if (value === "modification_removed") {
    return "Parça build profilinden kaldırıldı.";
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

  if (value === "modification_not_found") {
    return "Parça katalogda veya build profilinde bulunamadı.";
  }

  if (value === "modification_inactive") {
    return "Bu parça şu anda eklenemez.";
  }

  if (value === "modification_not_selectable") {
    return concreteModificationRequiredMessage;
  }

  if (value === "duplicate_modification") {
    return "Bu parça build profiline zaten eklenmiş.";
  }

  if (value === "modification_incompatible") {
    return "Bu parça seçilen araçla uyumlu değil.";
  }

  if (value === "component_slot_occupied") {
    return "Bu araçta aynı parça tipinden zaten bir ürün bulunuyor.";
  }

  if (value === "modification_conflict") {
    return "Bu parça yüklü başka bir parçayla çakışıyor.";
  }

  if (value === "modification_requirement_missing") {
    return "Bu parça için önce gerekli parça eklenmeli.";
  }

  if (value === "modification_required_by_installed_item") {
    return "Bu parça yüklü başka bir parça tarafından gerekli olduğu için kaldırılamaz.";
  }

  if (value === "modification_write_failed") {
    return "Build profili güncellenemedi. Lütfen tekrar deneyin.";
  }

  if (value) {
    return "Araç güncellenemedi. Lütfen tekrar deneyin.";
  }

  return null;
}

const modificationDefinitionLabelSelect = {
  id: true,
  code: true,
  category: true,
  brand: true,
  name: true,
  variant: true,
  componentTypeCode: true,
  usageClass: true,
} satisfies Prisma.ModificationDefinitionSelect;

const modificationDefinitionRuleSelect = {
  ...modificationDefinitionLabelSelect,
  active: true,
  description: true,
  sortOrder: true,
  brakePadSpecification: {
    select: {
      active: true,
      coldPerformance: true,
      hotPerformance: true,
      fadeResistance: true,
      streetSuitability: true,
      rotorWear: true,
      noiseLevel: true,
    },
  },
  sportSpringSpecification: {
    select: {
      active: true,
      approximateLoweringFrontMm: true,
      approximateLoweringRearMm: true,
      progressiveRate: true,
      roadSuitability: true,
      trackSuitability: true,
    },
  },
  bigBrakeKitSpecification: {
    select: {
      active: true,
      frontOrRear: true,
      pistonCount: true,
      rotorDiameterMm: true,
      rotorConstruction: true,
      roadSuitability: true,
      trackSuitability: true,
      thermalCapacity: true,
    },
  },
  tyreSpecification: {
    select: {
      active: true,
      tyreClass: true,
      dryGrip: true,
      wetGrip: true,
      coldPerformance: true,
      heatTolerance: true,
      trackConsistency: true,
      roadSuitability: true,
      wearLongevity: true,
      noiseComfort: true,
      roadLegal: true,
    },
  },
  wheelSpecification: {
    select: {
      active: true,
      construction: true,
      nominalDiameterInches: true,
      nominalWidthInches: true,
      weightKg: true,
      trackSuitability: true,
      roadSuitability: true,
    },
  },
  tuningPackageSpecification: {
    select: {
      active: true,
      tuneType: true,
      measurementBasis: true,
      mapStageLabel: true,
      mapProgramCode: true,
      claimedPowerMinHp: true,
      claimedPowerMaxHp: true,
      claimedTorqueMinNm: true,
      claimedTorqueMaxNm: true,
      minimumFuelOctaneRon: true,
      requiredFuelNote: true,
      hardwareRequirementNote: true,
      transmissionLimitNote: true,
      coolingRecommendationNote: true,
      confidence: true,
      sourceNote: true,
    },
  },
  compatibilities: {
    where: {
      active: true,
    },
    select: {
      active: true,
      vehicleBrand: true,
      vehicleModel: true,
      vehicleDefinitionId: true,
      platformFamilyId: true,
      engineFamilyId: true,
      yearFrom: true,
      yearTo: true,
    },
  },
  powertrainApplicabilities: {
    where: {
      active: true,
    },
    select: {
      active: true,
      powertrain: true,
    },
  },
  requirementGroups: {
    where: {
      active: true,
    },
    select: {
      active: true,
      description: true,
      options: {
        select: {
          requiredDefinitionId: true,
          requiredDefinition: {
            select: modificationDefinitionLabelSelect,
          },
        },
      },
    },
  },
  rulesAsSource: {
    where: {
      active: true,
    },
    select: {
      active: true,
      targetDefinitionId: true,
      ruleType: true,
    },
  },
  rulesAsTarget: {
    where: {
      active: true,
    },
    select: {
      active: true,
      sourceDefinitionId: true,
      ruleType: true,
    },
  },
} satisfies Prisma.ModificationDefinitionSelect;

const vehicleDefinitionTemplateSelect = {
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
} satisfies Prisma.VehicleDefinitionSelect;

const vehicleDefinitionRatingSelect = {
  ...vehicleDefinitionTemplateSelect,
  powertrain: true,
  platformFamilyId: true,
  engineFamilyId: true,
  powerRating: true,
  handlingRating: true,
  brakingRating: true,
  reliabilityRating: true,
  thermalRating: true,
  trackReadinessRating: true,
  weightPenalty: true,
  ratingStatus: true,
} satisfies Prisma.VehicleDefinitionSelect;

const vehicleModificationImpactSelect = {
  vehicleDefinitionId: true,
  powerImpact: true,
  handlingImpact: true,
  brakingImpact: true,
  reliabilityImpact: true,
  thermalImpact: true,
  trackReadinessImpact: true,
  active: true,
} satisfies Prisma.VehicleModificationImpactSelect;

function buildCatalogGroups({
  catalog,
  vehicle,
  installedModifications,
}: {
  catalog: Array<
    Prisma.ModificationDefinitionGetPayload<{
      select: typeof modificationDefinitionRuleSelect;
    }>
  >;
  vehicle: {
    id: string;
    userId: string;
    vehicleDefinitionId: string | null;
    vehicleDefinition?: {
      powertrain: VehiclePowertrain;
      platformFamilyId: string | null;
      engineFamilyId: string | null;
    } | null;
    brand: string;
    model: string;
    year: number | null;
    deletedAt: Date | null;
  };
  installedModifications: Array<{
    id: string;
    modificationDefinitionId: string;
    modificationDefinition: {
      id: string;
      code?: string;
      category: (typeof orderedModificationCategories)[number];
      brand: string | null;
      name: string;
      variant: string | null;
      componentTypeCode?: string | null;
      usageClass?: string | null;
    };
  }>;
}): ModificationCatalogGroup[] {
  const groupsByCategory = new Map<string, ModificationCatalogGroup>();
  const hasNamedProviderEcuTune = hasNamedProviderEcuTuneForVehicle({
    vehicle,
    definitions: catalog,
  });
  const hasNamedProviderTurbo = hasNamedProviderTurboForVehicle({
    vehicle,
    definitions: catalog,
  });
  const definitionsByCode = new Map(
    catalog.map((definition) => [definition.code, definition]),
  );
  const installedDefinitionIds = new Set(
    installedModifications.map(
      (modification) => modification.modificationDefinitionId,
    ),
  );

  for (const definition of catalog) {
    if (!isSelectableModificationLeaf(definition)) {
      continue;
    }

    if (isGenericEcuFallbackDefinition(definition) && hasNamedProviderEcuTune) {
      continue;
    }

    if (isGenericTurboFallbackDefinition(definition) && hasNamedProviderTurbo) {
      continue;
    }

    const typeCode = modificationTypeKey(definition);
    const typeKey = `${definition.category}:${typeCode}`;
    const visibleTyreClass = visibleTyreClassForDefinition(definition);
    const missingSupportGroups = missingModificationSupportGroups(
      definition,
      installedDefinitionIds,
    );
    const availability = evaluateModificationAvailability({
      vehicle,
      definition,
      installedModifications,
      hasNamedProviderEcuTune,
      hasNamedProviderTurbo,
    });
    const mayQueueWithRequirements =
      !availability.ok &&
      availability.code === "MODIFICATION_REQUIREMENT_MISSING";

    if (!availability.ok && availability.code === "MODIFICATION_INCOMPATIBLE") {
      continue;
    }

    const group =
      groupsByCategory.get(definition.category) ??
      {
        category: definition.category,
        categoryLabel: modificationCategoryLabels[definition.category],
        types: [],
      };
    const type =
      group.types.find((candidate) => candidate.typeKey === typeKey) ??
      {
        typeKey,
        typeLabel: modificationTypeLabel(definition),
        options: [],
      };

    type.options.push({
      code: definition.code,
      definitionId: definition.id,
      label: optionLabelForDefinition(definition),
      productLabel:
        definition.category === "TYRES"
          ? tyreProductModelLabel(definition)
          : [definition.name, definition.variant].filter(Boolean).join(" / "),
      manufacturerLabel: modificationManufacturerLabel(definition),
      brand: definition.brand,
      name: definition.name,
      variant: definition.variant,
      componentTypeCode: definition.componentTypeCode,
      usageClass: definition.usageClass,
      description: definition.description,
      brakePadSpecification: definition.brakePadSpecification?.active
        ? definition.brakePadSpecification
        : null,
      sportSpringSpecification: definition.sportSpringSpecification?.active
        ? definition.sportSpringSpecification
        : null,
      bigBrakeKitSpecification: definition.bigBrakeKitSpecification?.active
        ? definition.bigBrakeKitSpecification
        : null,
      tyreSpecification: definition.tyreSpecification?.active
        ? definition.tyreSpecification
        : null,
      tyrePresentation: visibleTyreClass
        ? {
            classLabel:
              visibleTyreClassLabel(visibleTyreClass) ?? "Lastik",
            badgeLabel:
              visibleTyreClassBadgeLabel(visibleTyreClass) ?? "Lastik",
            roadUseLabel: tyreRoadUseLabel(definition),
            surfaceIntentLabel: tyreSurfaceIntentLabel(definition),
            treadwearLabel: tyreTreadwearLabel(definition),
          }
        : null,
      wheelSpecification: definition.wheelSpecification?.active
        ? {
            construction: definition.wheelSpecification.construction,
            nominalDiameterInches:
              definition.wheelSpecification.nominalDiameterInches,
            nominalWidthInches: decimalToNumber(
              definition.wheelSpecification.nominalWidthInches,
            ),
            weightKg: decimalToNumber(definition.wheelSpecification.weightKg),
            trackSuitability: definition.wheelSpecification.trackSuitability,
            roadSuitability: definition.wheelSpecification.roadSuitability,
          }
        : null,
      tuningPackageSpecification: definition.tuningPackageSpecification?.active
        ? definition.tuningPackageSpecification
        : null,
      compatibilityLabel: compatibilityLabelForDefinition(definition, vehicle),
      requirementGroups: definition.requirementGroups.map((requirementGroup) => ({
        description: requirementGroup.description,
        optionLabels: requirementGroup.options.map((option) =>
          formatModificationDefinition(option.requiredDefinition),
        ),
      })),
      supportAdvisoryMessage:
        definition.requirementGroups.length > 0
          ? modificationSupportAdvisoryMessage
          : null,
      recommendationGroups: modificationRecommendationGroups(definition.code).map(
        (recommendationGroup) => ({
          description: recommendationGroup.description,
          optionLabels: recommendationGroup.optionCodes.flatMap((optionCode) => {
            const recommendedDefinition = definitionsByCode.get(optionCode);

            return recommendedDefinition
              ? [formatModificationDefinition(recommendedDefinition)]
              : [];
          }),
        }),
      ),
      hasMissingRequirements: missingSupportGroups.length > 0,
      fitmentNote: fitmentNoteForDefinition(definition),
      availability: availability.ok || mayQueueWithRequirements
        ? "AVAILABLE"
        : availability.code === "DUPLICATE_MODIFICATION"
          ? "INSTALLED"
          : "BLOCKED",
      reason: availability.ok
        ? undefined
        : mayQueueWithRequirements
          ? vehicleBuildResultLabel(availability.code, availability)
          : availability.code === "DUPLICATE_MODIFICATION"
            ? "Zaten yüklü"
            : vehicleBuildResultLabel(availability.code, availability),
    });

    if (!group.types.some((candidate) => candidate.typeKey === typeKey)) {
      group.types.push(type);
    }

    groupsByCategory.set(definition.category, group);
  }

  const groups = Array.from(groupsByCategory.values()).sort((firstGroup, secondGroup) => {
    const firstCategoryOrder = orderedModificationCategories.indexOf(
      firstGroup.category as (typeof orderedModificationCategories)[number],
    );
    const secondCategoryOrder = orderedModificationCategories.indexOf(
      secondGroup.category as (typeof orderedModificationCategories)[number],
    );

    if (firstCategoryOrder !== secondCategoryOrder) {
      return firstCategoryOrder - secondCategoryOrder;
    }

    return firstGroup.categoryLabel.localeCompare(secondGroup.categoryLabel, "tr-TR");
  });

  for (const group of groups) {
    group.types.sort((firstType, secondType) =>
      firstType.typeLabel.localeCompare(secondType.typeLabel, "tr-TR"),
    );
  }

  return groups;
}

function compatibilityLabelForDefinition(
  definition: {
    compatibilities: Array<{
      vehicleDefinitionId: string | null;
      platformFamilyId: string | null;
      engineFamilyId: string | null;
    }>;
    powertrainApplicabilities: Array<{
      active: boolean;
      powertrain: VehiclePowertrain;
    }>;
  },
  vehicle: {
    vehicleDefinitionId: string | null;
    vehicleDefinition?: {
      platformFamilyId: string | null;
      engineFamilyId: string | null;
    } | null;
  },
) {
  if (
    vehicle.vehicleDefinitionId &&
    definition.compatibilities.some(
      (compatibility) =>
        compatibility.vehicleDefinitionId === vehicle.vehicleDefinitionId,
    )
  ) {
    return "Araç tanımıyla birebir uyumlu";
  }

  if (
    vehicle.vehicleDefinition?.engineFamilyId &&
    definition.compatibilities.some(
      (compatibility) =>
        compatibility.engineFamilyId ===
        vehicle.vehicleDefinition?.engineFamilyId,
    )
  ) {
    return "Motor ailesiyle uyumlu";
  }

  if (
    vehicle.vehicleDefinition?.platformFamilyId &&
    definition.compatibilities.some(
      (compatibility) =>
        compatibility.platformFamilyId ===
        vehicle.vehicleDefinition?.platformFamilyId,
    )
  ) {
    return "Platform ailesiyle uyumlu";
  }

  return definition.powertrainApplicabilities.length > 0
    ? "Güç aktarma tipiyle uyumlu; ürün fitmentini doğrulayın"
    : "Evrensel teknik konfigürasyon; araç özelinde doğrulayın";
}

function decimalToNumber(value: Prisma.Decimal | null) {
  return value ? value.toNumber() : null;
}

function optionLabelForDefinition(definition: {
  code?: string;
  brand: string | null;
  name: string;
  variant: string | null;
  componentTypeCode?: string | null;
}) {
  return formatModificationDefinition(definition);
}

function fitmentNoteForDefinition(definition: {
  code?: string | null;
  componentTypeCode?: string | null;
}) {
  const componentTypeCode = definition.componentTypeCode;

  if (!componentTypeCode) {
    return undefined;
  }

  if (componentTypeCode === "big_brake_kit") {
    return "Kit ailesi kaydıdır. Disk ölçüsü, kaliper braketi, jant açıklığı ve araç uyumluluğunu ayrıca doğrulayın.";
  }

  if (
    componentTypeCode === "wheel" ||
    componentTypeCode === "lightweight_wheel" ||
    componentTypeCode === "forged_wheel"
  ) {
    return "Jant ailesi kaydıdır. Ölçü, bijon düzeni, merkez deliği, ET ve kaliper açıklığını ayrıca doğrulayın.";
  }

  if (
    componentTypeCode === "ecu_software" ||
    componentTypeCode === "platform_tune_package" ||
    componentTypeCode === "transmission_software" ||
    componentTypeCode === "flex_fuel"
  ) {
    return "Kalibrasyon kaydıdır. ECU/TCU yazılım versiyonu, yakıt, donanım ve tork limitini ayrıca doğrulayın.";
  }

  if (componentTypeCode === "flex_fuel_hardware") {
    return "Donanım kaydıdır. Sensör, yakıt hattı, yazılım ve ethanol kalibrasyonu uyumluluğunu ayrıca doğrulayın.";
  }

  if (
    componentTypeCode === "intake" ||
    componentTypeCode === "intercooler" ||
    componentTypeCode === "oil_cooler" ||
    componentTypeCode === "downpipe" ||
    componentTypeCode === "cat_back_exhaust" ||
    componentTypeCode === "axle_back_exhaust" ||
    componentTypeCode === "exhaust_manifold" ||
    componentTypeCode === "turbo_inlet" ||
    componentTypeCode === "charge_pipe"
  ) {
    return "Ürün ailesi kaydıdır. Motor, şasi ve bağlantı uyumluluğunu ayrıca doğrulayın.";
  }

  if (
    definition.code === "engine_hybrid_turbo_generic" ||
    definition.code === "engine_big_turbo_generic"
  ) {
    return "Genel build kaydıdır. Turbo, yakıt, yazılım ve bağlantı uyumluluğunu ayrıca doğrulayın.";
  }

  if (
    componentTypeCode === "turbo_upgrade" ||
    componentTypeCode === "hybrid_turbo" ||
    componentTypeCode === "big_turbo" ||
    componentTypeCode === "turbocharger_upgrade" ||
    componentTypeCode === "twin_turbo_upgrade" ||
    componentTypeCode === "supercharger_upgrade"
  ) {
    return "Turbo ürün ailesi kaydıdır. Yakıt, yazılım, soğutma, bağlantı ve motor uyumluluğunu ayrıca doğrulayın.";
  }

  if (componentTypeCode === "sport_springs") {
    return "Ürün ailesi kaydıdır. Aracınıza fiziksel uyumluluğu ayrıca doğrulayın.";
  }

  if (componentTypeCode === "damper") {
    return "Spor yay ile kullanılmalıdır. Damper boyu, yay oranı ve araç uyumluluğunu ayrıca doğrulayın.";
  }

  if (
    componentTypeCode === "anti_roll_bar_front" ||
    componentTypeCode === "anti_roll_bar_rear" ||
    componentTypeCode === "camber_plate" ||
    componentTypeCode === "adjustable_ball_joint" ||
    componentTypeCode === "adjustable_control_arm" ||
    componentTypeCode === "bushings" ||
    componentTypeCode === "dogbone_mount" ||
    componentTypeCode === "strut_brace" ||
    componentTypeCode === "chassis_brace"
  ) {
    return "Şasi donanımı kaydıdır. Parça, aks, geometri ve bağlantı uyumluluğunu ayrıca doğrulayın.";
  }

  return undefined;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function withCurrentVehicleDefinition(
  definitions: Array<
    Prisma.VehicleDefinitionGetPayload<{
      select: typeof vehicleDefinitionTemplateSelect;
    }>
  >,
  currentDefinition: Prisma.VehicleDefinitionGetPayload<{
    select: typeof vehicleDefinitionRatingSelect;
  }> | null,
) {
  if (!currentDefinition || definitions.some((definition) => definition.id === currentDefinition.id)) {
    return definitions;
  }

  return [
    {
      id: currentDefinition.id,
      code: currentDefinition.code,
      brand: currentDefinition.brand,
      model: currentDefinition.model,
      generation: currentDefinition.generation,
      chassisCode: currentDefinition.chassisCode,
      variant: currentDefinition.variant,
      yearFrom: currentDefinition.yearFrom,
      yearTo: currentDefinition.yearTo,
      engineFamily: currentDefinition.engineFamily,
    },
    ...definitions,
  ];
}

function vehicleDefinitionLabel(definition: {
  brand: string;
  model: string;
  generation: string | null;
  chassisCode: string | null;
  variant: string | null;
}) {
  return [
    definition.brand,
    definition.model,
    definition.generation,
    definition.chassisCode,
    definition.variant,
  ]
    .filter(Boolean)
    .join(" / ");
}
