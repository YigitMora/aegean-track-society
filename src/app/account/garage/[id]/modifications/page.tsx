import Link from "next/link";
import { ModificationCategory, Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import {
  addVehicleModificationAction,
  removeVehicleModificationAction,
} from "@/app/account/garage/actions";
import { requireCompleteMemberUser } from "@/lib/member-access";
import { prisma } from "@/lib/prisma";
import {
  evaluateModificationAvailability,
  formatModificationDefinition,
  modificationCategoryLabels,
  orderedModificationCategories,
  vehicleBuildResultLabel,
} from "@/lib/vehicle-build-rules";

type VehicleModificationsPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    category?: string;
    q?: string;
    build?: string;
    garageError?: string;
  }>;
};

const maxSearchLength = 100;

export const dynamic = "force-dynamic";

export default async function VehicleModificationsPage({
  params,
  searchParams,
}: VehicleModificationsPageProps) {
  const [{ id }, queryParams] = await Promise.all([params, searchParams]);
  const memberUser = await requireCompleteMemberUser(
    `/account/garage/${id}/modifications`,
  );
  const category = isModificationCategory(queryParams.category)
    ? queryParams.category
    : undefined;
  const query = normalizeSearch(queryParams.q);
  const currentHref = vehicleModificationsHref(id, { category, query });
  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id,
      userId: memberUser.id,
      deletedAt: null,
    },
    select: {
      id: true,
      userId: true,
      brand: true,
      model: true,
      year: true,
      plateNumber: true,
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
        select: installedModificationDetailSelect,
      },
    },
  });

  if (!vehicle) {
    redirect("/account/garage?garageError=not_found");
  }

  const catalog = await prisma.modificationDefinition.findMany({
    where: {
      active: true,
      ...(category ? { category } : {}),
      ...(query
        ? {
            OR: [
              { brand: { contains: query, mode: "insensitive" } },
              { name: { contains: query, mode: "insensitive" } },
              { variant: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
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
  });
  const installedModifications = vehicle.modifications;
  const installedByDefinitionId = new Map(
    installedModifications.map((modification) => [
      modification.modificationDefinitionId,
      modification,
    ]),
  );

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-10 lg:py-24">
      <Link
        href={`/account/garage/${vehicle.id}`}
        className="text-xs font-black uppercase tracking-[0.16em] text-ats-muted transition hover:text-ats-blue"
      >
        Araca dön
      </Link>

      <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-ats-blue">
            Build Profili
          </p>
          <h1 className="mt-5 text-5xl font-black leading-none text-ats-text sm:text-7xl">
            Modifikasyonlar
          </h1>
          <p className="mt-6 text-base leading-7 text-ats-muted sm:text-lg sm:leading-8">
            {vehicle.brand} {vehicle.model} · {vehicle.plateNumber}
          </p>
        </div>

        <BuildSummary modifications={installedModifications} />
      </div>

      <BuildMessage build={queryParams.build} garageError={queryParams.garageError} />

      <form
        action={`/account/garage/${vehicle.id}/modifications`}
        method="get"
        className="mt-10 grid gap-3 rounded-lg border border-ats-border bg-ats-surface p-4 shadow-soft md:grid-cols-[1fr_220px_auto_auto]"
      >
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-ats-muted">
            Parça ara
          </span>
          <input
            name="q"
            defaultValue={query}
            maxLength={maxSearchLength}
            placeholder="Marka, parça veya varyant"
            className="mt-2 h-11 w-full rounded-md border border-ats-border bg-ats-black px-3 text-sm font-semibold text-ats-text outline-none transition placeholder:text-ats-muted/60 focus:border-ats-blue"
          />
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-ats-muted">
            Kategori
          </span>
          <select
            name="category"
            defaultValue={category ?? ""}
            className="mt-2 h-11 w-full rounded-md border border-ats-border bg-ats-black px-3 text-sm font-semibold text-ats-text outline-none transition focus:border-ats-blue"
          >
            <option value="">Tümü</option>
            {orderedModificationCategories.map((item) => (
              <option key={item} value={item}>
                {modificationCategoryLabels[item]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="h-11 self-end rounded-full bg-ats-blue px-5 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover"
        >
          Filtrele
        </button>
        <Link
          href={`/account/garage/${vehicle.id}/modifications`}
          className="inline-flex h-11 items-center justify-center self-end rounded-full border border-ats-border px-5 text-sm font-black text-ats-text transition hover:border-ats-blue hover:text-ats-blue"
        >
          Temizle
        </Link>
      </form>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section>
          <div className="grid gap-4">
            {catalog.map((definition) => {
              const installedModification = installedByDefinitionId.get(definition.id);
              const availability = evaluateModificationAvailability({
                vehicle,
                definition,
                installedModifications,
              });

              return (
                <ModificationCatalogCard
                  key={definition.id}
                  vehicleId={vehicle.id}
                  definition={definition}
                  availability={availability}
                  installedModification={installedModification}
                  returnTo={currentHref}
                />
              );
            })}
            {catalog.length === 0 ? (
              <p className="rounded-lg border border-ats-border bg-ats-surface p-6 text-sm font-semibold text-ats-muted shadow-soft">
                Bu filtrelerle eşleşen katalog parçası yok.
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-lg border border-ats-border bg-ats-surface p-5 shadow-soft">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-ats-blue">
            Yüklü parçalar
          </p>
          <InstalledModificationGroups
            vehicleId={vehicle.id}
            modifications={installedModifications}
            returnTo={currentHref}
          />
        </section>
      </div>
    </section>
  );
}

function ModificationCatalogCard({
  vehicleId,
  definition,
  availability,
  installedModification,
  returnTo,
}: {
  vehicleId: string;
  definition: Prisma.ModificationDefinitionGetPayload<{
    select: typeof modificationDefinitionRuleSelect;
  }>;
  availability: ReturnType<typeof evaluateModificationAvailability>;
  installedModification?: Prisma.VehicleModificationGetPayload<{
    select: typeof installedModificationDetailSelect;
  }>;
  returnTo: string;
}) {
  const addAction = addVehicleModificationAction.bind(null, vehicleId, definition.id);
  const removeAction = installedModification
    ? removeVehicleModificationAction.bind(null, vehicleId, installedModification.id)
    : null;

  return (
    <article className="rounded-lg border border-ats-border bg-ats-surface p-5 shadow-soft">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-ats-blue">
            {modificationCategoryLabels[definition.category]}
          </p>
          <h2 className="mt-2 text-2xl font-black text-ats-text">
            {formatModificationDefinition(definition)}
          </h2>
          {definition.description ? (
            <p className="mt-2 text-sm font-semibold leading-6 text-ats-muted">
              {definition.description}
            </p>
          ) : null}
        </div>
        <StatusPill
          label={installedModification ? "Yüklü" : availability.ok ? "Eklenebilir" : "Kilitli"}
          tone={installedModification ? "success" : availability.ok ? "ready" : "blocked"}
        />
      </div>

      {installedModification && removeAction ? (
        <form action={removeAction} className="mt-5">
          <input type="hidden" name="returnTo" value={returnTo} />
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-full border border-red-300/40 px-5 text-xs font-black uppercase tracking-[0.12em] text-red-100 transition hover:bg-red-300 hover:text-ats-black"
          >
            Parçayı kaldır
          </button>
        </form>
      ) : availability.ok ? (
        <form action={addAction} className="mt-5 grid gap-4 md:grid-cols-[1fr_180px_auto] md:items-end">
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-ats-muted">
              Opsiyonel not
            </span>
            <input
              name="customNotes"
              maxLength={280}
              placeholder="Örn. ön aks, yaz seti, servis notu"
              className="mt-2 h-11 w-full rounded-md border border-ats-border bg-ats-black px-3 text-sm font-semibold text-ats-text outline-none transition placeholder:text-ats-muted/60 focus:border-ats-blue"
            />
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-ats-muted">
              Montaj tarihi
            </span>
            <input
              name="installedAt"
              type="date"
              className="mt-2 h-11 w-full rounded-md border border-ats-border bg-ats-black px-3 text-sm font-semibold text-ats-text outline-none transition focus:border-ats-blue"
            />
          </label>
          <button
            type="submit"
            className="h-11 rounded-full bg-ats-blue px-5 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover"
          >
            Parça ekle
          </button>
        </form>
      ) : (
        <p className="mt-5 rounded-md border border-ats-border bg-ats-black px-4 py-3 text-sm font-semibold text-ats-muted">
          {vehicleBuildResultLabel(availability.code, availability)}
        </p>
      )}
    </article>
  );
}

function InstalledModificationGroups({
  vehicleId,
  modifications,
  returnTo,
}: {
  vehicleId: string;
  modifications: Array<
    Prisma.VehicleModificationGetPayload<{
      select: typeof installedModificationDetailSelect;
    }>
  >;
  returnTo: string;
}) {
  if (modifications.length === 0) {
    return (
      <p className="mt-4 rounded-md border border-ats-border bg-ats-black p-4 text-sm font-semibold text-ats-muted">
        Build profiline henüz parça eklenmedi.
      </p>
    );
  }

  return (
    <div className="mt-5 space-y-6">
      {orderedModificationCategories.map((category) => {
        const categoryModifications = modifications.filter(
          (modification) =>
            modification.modificationDefinition.category === category,
        );

        if (categoryModifications.length === 0) {
          return null;
        }

        return (
          <div key={category}>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-ats-muted">
              {modificationCategoryLabels[category]}
            </p>
            <div className="mt-3 space-y-3">
              {categoryModifications.map((modification) => {
                const removeAction = removeVehicleModificationAction.bind(
                  null,
                  vehicleId,
                  modification.id,
                );

                return (
                  <article
                    key={modification.id}
                    className="rounded-md border border-ats-border bg-ats-black p-4"
                  >
                    <p className="font-black text-ats-text">
                      {formatModificationDefinition(modification.modificationDefinition)}
                    </p>
                    {modification.customNotes ? (
                      <p className="mt-2 text-sm font-semibold leading-6 text-ats-muted">
                        {modification.customNotes}
                      </p>
                    ) : null}
                    {modification.installedAt ? (
                      <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-ats-muted">
                        Montaj: {formatDate(modification.installedAt)}
                      </p>
                    ) : null}
                    <form action={removeAction} className="mt-4">
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <button
                        type="submit"
                        className="inline-flex h-10 items-center justify-center rounded-full border border-red-300/40 px-4 text-xs font-black uppercase tracking-[0.12em] text-red-100 transition hover:bg-red-300 hover:text-ats-black"
                      >
                        Parçayı kaldır
                      </button>
                    </form>
                  </article>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BuildSummary({
  modifications,
}: {
  modifications: Array<
    Prisma.VehicleModificationGetPayload<{
      select: typeof installedModificationDetailSelect;
    }>
  >;
}) {
  const categoryCount = new Set(
    modifications.map((modification) => modification.modificationDefinition.category),
  ).size;

  return (
    <section className="grid grid-cols-2 gap-3 rounded-lg border border-ats-border bg-ats-surface p-5 shadow-soft">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-ats-muted">
          Parça
        </p>
        <p className="mt-2 text-4xl font-black text-ats-text">{modifications.length}</p>
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-ats-muted">
          Kategori
        </p>
        <p className="mt-2 text-4xl font-black text-ats-text">{categoryCount}</p>
      </div>
    </section>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "ready" | "blocked";
}) {
  const className =
    tone === "success"
      ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-100"
      : tone === "ready"
        ? "border-ats-blue/40 bg-ats-blue/10 text-ats-blue"
        : "border-ats-border bg-ats-black text-ats-muted";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${className}`}>
      {label}
    </span>
  );
}

function BuildMessage({
  build,
  garageError,
}: {
  build?: string;
  garageError?: string;
}) {
  const success = buildMessage(build);
  const error = garageErrorMessage(garageError);

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

const modificationDefinitionLabelSelect = {
  id: true,
  category: true,
  brand: true,
  name: true,
  variant: true,
} satisfies Prisma.ModificationDefinitionSelect;

const modificationDefinitionRuleSelect = {
  ...modificationDefinitionLabelSelect,
  active: true,
  description: true,
  compatibilities: {
    where: {
      active: true,
    },
    select: {
      active: true,
      vehicleBrand: true,
      vehicleModel: true,
      yearFrom: true,
      yearTo: true,
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

const installedModificationDetailSelect = {
  id: true,
  modificationDefinitionId: true,
  customNotes: true,
  installedAt: true,
  createdAt: true,
  modificationDefinition: {
    select: modificationDefinitionLabelSelect,
  },
} satisfies Prisma.VehicleModificationSelect;

function isModificationCategory(value?: string): value is ModificationCategory {
  return Boolean(
    value &&
      orderedModificationCategories.includes(value as ModificationCategory),
  );
}

function normalizeSearch(value?: string) {
  return value?.trim().slice(0, maxSearchLength) ?? "";
}

function vehicleModificationsHref(
  vehicleId: string,
  filters: {
    category?: ModificationCategory;
    query: string;
  },
) {
  const params = new URLSearchParams();

  if (filters.query) {
    params.set("q", filters.query);
  }

  if (filters.category) {
    params.set("category", filters.category);
  }

  const search = params.toString();

  return search
    ? `/account/garage/${vehicleId}/modifications?${search}`
    : `/account/garage/${vehicleId}/modifications`;
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

function garageErrorMessage(value?: string) {
  if (value === "modification_not_found") {
    return "Parça katalogda veya build profilinde bulunamadı.";
  }

  if (value === "modification_inactive") {
    return "Bu parça şu anda eklenemez.";
  }

  if (value === "duplicate_modification") {
    return "Bu parça build profiline zaten eklenmiş.";
  }

  if (value === "modification_incompatible") {
    return "Bu parça seçilen araçla uyumlu değil.";
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
    return "İşlem tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.";
  }

  return null;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}
