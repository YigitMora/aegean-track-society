"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  VehicleModificationBatchActionState,
  VehicleRatingPreviewState,
} from "@/app/account/garage/actions";
import {
  formatRatingDelta,
  ratingComponentRows,
  ratingDelta,
  ratingDeltaTone,
  type RatingDeltaTone,
} from "@/lib/vehicle-rating-deltas";

export type ModificationCatalogGroup = {
  category: string;
  categoryLabel: string;
  types: Array<{
    typeKey: string;
    typeLabel: string;
      options: Array<{
        definitionId: string;
        label: string;
        brand: string | null;
        name: string;
        variant: string | null;
        availability: "AVAILABLE" | "INSTALLED" | "BLOCKED";
      usageClass?: string | null;
      brakePadSpecification?: BrakePadSpecificationSummary | null;
      sportSpringSpecification?: SportSpringSpecificationSummary | null;
      bigBrakeKitSpecification?: BigBrakeKitSpecificationSummary | null;
      tyreSpecification?: TyreSpecificationSummary | null;
      wheelSpecification?: WheelSpecificationSummary | null;
      tuningPackageSpecification?: TuningPackageSpecificationSummary | null;
      fitmentNote?: string;
      reason?: string;
    }>;
  }>;
};

type BrakePadSpecificationSummary = {
  coldPerformance: number;
  hotPerformance: number;
  fadeResistance: number;
  streetSuitability: number;
  rotorWear: number;
  noiseLevel: number;
};

type SportSpringSpecificationSummary = {
  approximateLoweringFrontMm: number | null;
  approximateLoweringRearMm: number | null;
  progressiveRate: boolean | null;
  roadSuitability: number;
  trackSuitability: number;
};

type BigBrakeKitSpecificationSummary = {
  frontOrRear: string;
  pistonCount: number | null;
  rotorDiameterMm: number | null;
  rotorConstruction: string | null;
  roadSuitability: number;
  trackSuitability: number;
  thermalCapacity: number;
};

type TyreSpecificationSummary = {
  tyreClass: string;
  dryGrip: number;
  wetGrip: number;
  coldPerformance: number;
  heatTolerance: number;
  trackConsistency: number;
  roadSuitability: number;
  wearLongevity: number;
  noiseComfort: number;
  roadLegal: boolean | null;
};

type WheelSpecificationSummary = {
  construction: string;
  nominalDiameterInches: number | null;
  nominalWidthInches: number | null;
  weightKg: number | null;
  trackSuitability: number;
  roadSuitability: number;
};

type TuningPackageSpecificationSummary = {
  tuneType: string;
  measurementBasis: string | null;
  mapStageLabel: string | null;
  mapProgramCode: string | null;
  claimedPowerMinHp: number | null;
  claimedPowerMaxHp: number | null;
  claimedTorqueMinNm: number | null;
  claimedTorqueMaxNm: number | null;
  minimumFuelOctaneRon: number | null;
  requiredFuelNote: string | null;
  hardwareRequirementNote: string | null;
  transmissionLimitNote: string | null;
  coolingRecommendationNote: string | null;
  confidence: string;
  sourceNote: string | null;
};

type VehicleModificationBatchSelectorProps = {
  action: (
    state: VehicleModificationBatchActionState,
    formData: FormData,
  ) => Promise<VehicleModificationBatchActionState>;
  previewAction: (formData: FormData) => Promise<VehicleRatingPreviewState>;
  catalogGroups: ModificationCatalogGroup[];
};

const initialState: VehicleModificationBatchActionState = {
  ok: false,
  code: null,
  message: null,
  offendingDefinitionId: undefined,
  insertedCount: 0,
  submittedAt: 0,
};

export function VehicleModificationBatchSelector({
  action,
  previewAction,
  catalogGroups,
}: VehicleModificationBatchSelectorProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [previewState, setPreviewState] = useState<VehicleRatingPreviewState | null>(null);
  const [isPreviewPending, setIsPreviewPending] = useState(false);
  const [queuedDefinitionIds, setQueuedDefinitionIds] = useState<string[]>([]);
  const previewRequestVersion = useRef(0);
  const visibleCatalogGroups = useMemo(
    () =>
      catalogGroups
        .map((group) => ({
          ...group,
          types: group.types
            .map((type) => ({
              ...type,
              options: type.options.filter(Boolean),
            }))
            .filter((type) => type.options.length > 0),
        }))
        .filter((group) => group.types.length > 0),
    [catalogGroups],
  );
  const [selectedCategory, setSelectedCategory] = useState(
    visibleCatalogGroups[0]?.category ?? "",
  );
  const selectedGroup =
    visibleCatalogGroups.find((group) => group.category === selectedCategory) ??
    visibleCatalogGroups[0] ??
    null;
  const [selectedTypeKey, setSelectedTypeKey] = useState(
    selectedGroup?.types[0]?.typeKey ?? "",
  );
  const selectedType =
    selectedGroup?.types.find((type) => type.typeKey === selectedTypeKey) ??
    selectedGroup?.types[0] ??
    null;
  const firstAvailableOption =
    selectedType?.options.find((option) => option.availability === "AVAILABLE") ??
    selectedType?.options[0] ??
    null;
  const [selectedDefinitionId, setSelectedDefinitionId] = useState(
    firstAvailableOption?.definitionId ?? "",
  );
  const selectedOption =
    selectedType?.options.find(
      (option) => option.definitionId === selectedDefinitionId,
    ) ??
    firstAvailableOption ??
    null;
  const queuedDefinitionIdSet = useMemo(
    () => new Set(queuedDefinitionIds),
    [queuedDefinitionIds],
  );
  const queuedOptions = queuedDefinitionIds.flatMap((definitionId) => {
    const option = optionByDefinitionId(catalogGroups, definitionId);

    return option ? [option] : [];
  });
  const canQueueSelected =
    Boolean(selectedOption) &&
    selectedOption?.availability === "AVAILABLE" &&
    !queuedDefinitionIdSet.has(selectedOption.definitionId);
  const queueKey = queuedDefinitionIds.join("|");
  const highlightedDefinitionId =
    (!state.ok && state.offendingDefinitionId) ||
    (!previewState?.ok && previewState?.offendingDefinitionId) ||
    null;

  useEffect(() => {
    if (!selectedGroup) {
      setSelectedCategory("");
      setSelectedTypeKey("");
      setSelectedDefinitionId("");
      return;
    }

    if (selectedGroup.category !== selectedCategory) {
      const nextType = selectedGroup.types[0] ?? null;
      const nextOption =
        nextType?.options.find((option) => option.availability === "AVAILABLE") ??
        nextType?.options[0] ??
        null;

      setSelectedCategory(selectedGroup.category);
      setSelectedTypeKey(nextType?.typeKey ?? "");
      setSelectedDefinitionId(nextOption?.definitionId ?? "");
      return;
    }

    if (!selectedType || selectedType.typeKey !== selectedTypeKey) {
      const nextType = selectedGroup.types[0] ?? null;
      const nextOption =
        nextType?.options.find((option) => option.availability === "AVAILABLE") ??
        nextType?.options[0] ??
        null;

      setSelectedTypeKey(nextType?.typeKey ?? "");
      setSelectedDefinitionId(nextOption?.definitionId ?? "");
      return;
    }

    if (!selectedOption || selectedOption.definitionId !== selectedDefinitionId) {
      const nextOption =
        selectedType.options.find((option) => option.availability === "AVAILABLE") ??
        selectedType.options[0] ??
        null;

      setSelectedDefinitionId(nextOption?.definitionId ?? "");
    }
  }, [
    selectedCategory,
    selectedDefinitionId,
    selectedGroup,
    selectedOption,
    selectedType,
    selectedTypeKey,
  ]);

  useEffect(() => {
    if (!state.ok || state.submittedAt === 0) {
      return;
    }

    setQueuedDefinitionIds([]);
    setPreviewState(null);
    setIsPreviewPending(false);
    router.refresh();
  }, [router, state.ok, state.submittedAt]);

  useEffect(() => {
    previewRequestVersion.current += 1;
    const requestVersion = previewRequestVersion.current;

    if (queuedDefinitionIds.length === 0) {
      setPreviewState(null);
      setIsPreviewPending(false);
      return;
    }

    setIsPreviewPending(true);

    const timeoutId = window.setTimeout(() => {
      const formData = new FormData();

      for (const definitionId of queuedDefinitionIds) {
        formData.append("modificationDefinitionIds", definitionId);
      }

      previewAction(formData)
        .then((nextPreviewState) => {
          if (previewRequestVersion.current !== requestVersion) {
            return;
          }

          setPreviewState(nextPreviewState);
        })
        .catch(() => {
          if (previewRequestVersion.current !== requestVersion) {
            return;
          }

          setPreviewState({
            ok: false,
            code: "PREVIEW_FAILED",
            message: "Tahmini rating hesaplanamadı.",
            currentRating: null,
            projectedRating: null,
            submittedAt: Date.now(),
          });
        })
        .finally(() => {
          if (previewRequestVersion.current === requestVersion) {
            setIsPreviewPending(false);
          }
        });
    }, 320);

    return () => window.clearTimeout(timeoutId);
  }, [previewAction, queueKey, queuedDefinitionIds]);

  if (visibleCatalogGroups.length === 0) {
    return (
      <p className="mt-4 rounded-md border border-ats-border bg-ats-black p-4 text-sm font-semibold text-ats-muted">
        Eklenebilir katalog parçası bulunamadı.
      </p>
    );
  }

  return (
    <div className="mt-4 grid gap-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
        <SelectField
          label="Kategori"
          value={selectedGroup?.category ?? ""}
          onChange={(value) => {
            const nextGroup =
              visibleCatalogGroups.find((group) => group.category === value) ??
              visibleCatalogGroups[0];
            const nextType = nextGroup?.types[0] ?? null;
            const nextOption =
              nextType?.options.find((option) => option.availability === "AVAILABLE") ??
              nextType?.options[0] ??
              null;

            setSelectedCategory(nextGroup?.category ?? "");
            setSelectedTypeKey(nextType?.typeKey ?? "");
            setSelectedDefinitionId(nextOption?.definitionId ?? "");
          }}
          options={visibleCatalogGroups.map((group) => ({
            value: group.category,
            label: group.categoryLabel,
          }))}
        />

        <SelectField
          label="Parça tipi"
          value={selectedType?.typeKey ?? ""}
          onChange={(value) => {
            const nextType =
              selectedGroup?.types.find((type) => type.typeKey === value) ??
              selectedGroup?.types[0] ??
              null;
            const nextOption =
              nextType?.options.find((option) => option.availability === "AVAILABLE") ??
              nextType?.options[0] ??
              null;

            setSelectedTypeKey(nextType?.typeKey ?? "");
            setSelectedDefinitionId(nextOption?.definitionId ?? "");
          }}
          options={(selectedGroup?.types ?? []).map((type) => ({
            value: type.typeKey,
            label: type.typeLabel,
          }))}
        />

        <SelectField
          label="Marka / varyant"
          value={selectedOption?.definitionId ?? ""}
          onChange={setSelectedDefinitionId}
          options={(selectedType?.options ?? []).map((option) => ({
            value: option.definitionId,
            label:
              option.availability === "AVAILABLE"
                ? option.label
                : `${option.label} - ${option.reason ?? availabilityLabel(option.availability)}`,
            disabled: option.availability !== "AVAILABLE",
          }))}
        />

        <button
          type="button"
          disabled={!canQueueSelected}
          onClick={() => {
            if (!selectedOption || !canQueueSelected) {
              return;
            }

            setQueuedDefinitionIds((current) => [
              ...current,
              selectedOption.definitionId,
            ]);
          }}
          className="h-11 rounded-full bg-ats-blue px-5 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover disabled:cursor-not-allowed disabled:border disabled:border-ats-border disabled:bg-ats-black disabled:text-ats-muted lg:whitespace-nowrap"
        >
          Listeye ekle
        </button>
      </div>

      {selectedOption && selectedOption.availability !== "AVAILABLE" ? (
        <p className="rounded-md border border-ats-border bg-ats-black px-4 py-3 text-sm font-semibold text-ats-muted">
          {selectedOption.reason ?? availabilityLabel(selectedOption.availability)}
        </p>
      ) : null}

      {selectedOption && queuedDefinitionIdSet.has(selectedOption.definitionId) ? (
        <p className="rounded-md border border-ats-blue/30 bg-ats-blue/10 px-4 py-3 text-sm font-semibold text-ats-text">
          Bu parça ekleme listesinde zaten var.
        </p>
      ) : null}

      <CatalogOptionDetails option={selectedOption} />

      <form action={formAction} className="rounded-md border border-ats-border bg-ats-black p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-ats-blue">
              Eklenecek parçalar
            </p>
            <p className="mt-2 text-sm font-semibold text-ats-muted">
              {queuedOptions.length > 0
                ? `${queuedOptions.length} parça sırada`
                : "Listeye henüz parça eklenmedi."}
            </p>
          </div>
          <button
            type="submit"
            disabled={queuedOptions.length === 0 || isPending}
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-ats-blue px-5 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover disabled:cursor-not-allowed disabled:border disabled:border-ats-border disabled:bg-ats-black disabled:text-ats-muted sm:w-auto"
          >
            {isPending
              ? "Parçalar ekleniyor..."
              : `${queuedOptions.length || 0} parçayı ekle`}
          </button>
        </div>

        {queuedOptions.length > 0 ? (
          <ul className="mt-4 divide-y divide-ats-border rounded-md border border-ats-border">
            {queuedOptions.map((option) => (
              <li
                key={option.definitionId}
                className={`grid gap-3 px-3 py-2 sm:grid-cols-[1fr_auto] sm:items-center ${
                  highlightedDefinitionId === option.definitionId
                    ? "bg-red-500/10"
                    : ""
                }`}
              >
                <span className="min-w-0 break-words text-sm font-black text-ats-text">
                  {option.label}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setQueuedDefinitionIds((current) =>
                      current.filter(
                        (definitionId) => definitionId !== option.definitionId,
                      ),
                    )
                  }
                  className="inline-flex h-8 items-center justify-center rounded-full border border-ats-border px-3 text-xs font-black uppercase tracking-[0.1em] text-ats-muted transition hover:border-red-300/60 hover:text-red-100"
                >
                  Kaldır
                </button>
                <input
                  type="hidden"
                  name="modificationDefinitionIds"
                  value={option.definitionId}
                />
              </li>
            ))}
          </ul>
        ) : null}

        <ProjectedRatingPreviewPanel
          previewState={previewState}
          isPending={isPreviewPending}
          queuedCount={queuedOptions.length}
        />

        {state.message ? (
          <p
            className={`mt-4 rounded-md border px-4 py-3 text-sm font-semibold ${
              state.ok
                ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-100"
                : "border-red-300/30 bg-red-500/10 text-red-100"
            }`}
          >
            {state.message}
          </p>
        ) : null}
        <p className="sr-only" aria-live="polite">
          {isPending
            ? "Parçalar ekleniyor..."
            : isPreviewPending
              ? "Tahmini rating hesaplanıyor..."
              : state.message ?? previewState?.message ?? ""}
        </p>
      </form>
    </div>
  );
}

function CatalogOptionDetails({
  option,
}: {
  option: ModificationCatalogGroup["types"][number]["options"][number] | null;
}) {
  if (!option) {
    return null;
  }

  const details: Array<[string, string | number]> = [
    ["Kullanım", usageClassLabel(option.usageClass)],
  ];
  let warning: string | null = null;

  if (option.brakePadSpecification) {
    const spec = option.brakePadSpecification;

    details.push(
      ["Soğuk", spec.coldPerformance],
      ["Sıcak", spec.hotPerformance],
      ["Fade", spec.fadeResistance],
      ["Yol", spec.streetSuitability],
      ["Disk aşındırma", spec.rotorWear],
      ["Gürültü", spec.noiseLevel],
    );
  } else if (option.sportSpringSpecification) {
    const spec = option.sportSpringSpecification;

    details.push(
      ["Yol", spec.roadSuitability],
      ["Pist", spec.trackSuitability],
      ["Progresif", spec.progressiveRate === null ? "Belirsiz" : spec.progressiveRate ? "Evet" : "Hayır"],
    );

    if (
      spec.approximateLoweringFrontMm !== null ||
      spec.approximateLoweringRearMm !== null
    ) {
      details.push([
        "Alçaltma",
        `${spec.approximateLoweringFrontMm ?? "-"} / ${
          spec.approximateLoweringRearMm ?? "-"
        } mm`,
      ]);
    }
  } else if (option.bigBrakeKitSpecification) {
    const spec = option.bigBrakeKitSpecification;

    details.push(
      ["Aks", bigBrakeKitAxleLabel(spec.frontOrRear)],
      ["Piston", spec.pistonCount ?? "Belirsiz"],
      ["Disk", spec.rotorDiameterMm ? `${spec.rotorDiameterMm} mm` : "Belirsiz"],
      ["Disk yapı", rotorConstructionLabel(spec.rotorConstruction)],
      ["Termal", spec.thermalCapacity],
      ["Pist", spec.trackSuitability],
    );
  } else if (option.tyreSpecification) {
    const spec = option.tyreSpecification;

    details.push(
      ["Sınıf", tyreClassLabel(spec.tyreClass)],
      ["Kuru", spec.dryGrip],
      ["Islak", spec.wetGrip],
      ["Soğuk", spec.coldPerformance],
      ["Isı", spec.heatTolerance],
      ["Stabilite", spec.trackConsistency],
      ["Yol", spec.roadSuitability],
      ["Aşınma", spec.wearLongevity],
      ["Konfor", spec.noiseComfort],
      ["Yol legal", spec.roadLegal === null ? "Belirsiz" : spec.roadLegal ? "Evet" : "Hayır"],
    );

    if (spec.tyreClass === "SLICK") {
      warning =
        "Yarış lastiğidir. Yol kullanımı ve ıslak zemin uygunluğu sınırlıdır.";
    }
  } else if (option.wheelSpecification) {
    const spec = option.wheelSpecification;

    details.push(
      ["Marka", option.brand ?? "Belirsiz"],
      ["Model", option.variant ?? option.name],
      ["Yapı", wheelConstructionLabel(spec.construction)],
      ["Yol", spec.roadSuitability],
      ["Pist", spec.trackSuitability],
    );

    if (spec.nominalDiameterInches !== null || spec.nominalWidthInches !== null) {
      details.push([
        "Ölçü",
        `${spec.nominalDiameterInches ?? "-"}x${spec.nominalWidthInches ?? "-"} in`,
      ]);
    }

    if (spec.weightKg !== null) {
      details.push(["Ağırlık", `${spec.weightKg.toFixed(2)} kg`]);
    }
  } else if (option.tuningPackageSpecification) {
    const spec = option.tuningPackageSpecification;

    details.push(
      ["Sağlayıcı", option.brand ?? "Belirsiz"],
      ["Ürün", option.name],
      ["Paket", tuningPackageTypeLabel(spec.tuneType)],
      ["Harita", spec.mapStageLabel ?? "Belirtilmedi"],
      ["Ölçüm", powerMeasurementBasisLabel(spec.measurementBasis)],
      ["Güven", calibrationConfidenceLabel(spec.confidence)],
    );

    if (spec.mapProgramCode) {
      details.push(["Program", spec.mapProgramCode]);
    }

    if (spec.claimedPowerMinHp !== null || spec.claimedPowerMaxHp !== null) {
      details.push([
        "Üretici güç beyanı",
        formatRange(spec.claimedPowerMinHp, spec.claimedPowerMaxHp, "hp"),
      ]);
    }

    if (spec.claimedTorqueMinNm !== null || spec.claimedTorqueMaxNm !== null) {
      details.push([
        "Üretici tork beyanı",
        formatRange(spec.claimedTorqueMinNm, spec.claimedTorqueMaxNm, "Nm"),
      ]);
    }

    if (spec.minimumFuelOctaneRon !== null) {
      details.push(["Yakıt", `${spec.minimumFuelOctaneRon} RON+`]);
    }
  } else {
    return null;
  }

  const tuningNotes = option.tuningPackageSpecification
    ? [
        option.tuningPackageSpecification.requiredFuelNote,
        option.tuningPackageSpecification.hardwareRequirementNote,
        option.tuningPackageSpecification.transmissionLimitNote,
        option.tuningPackageSpecification.coolingRecommendationNote,
      ].filter((note): note is string => Boolean(note))
    : [];

  return (
    <div className="rounded-md border border-ats-border bg-ats-black px-4 py-3">
      <dl className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-ats-muted">
        {details.map(([label, value]) => (
          <div key={label} className="flex items-center gap-1.5">
            <dt className="font-black uppercase tracking-[0.1em]">{label}</dt>
            <dd className="text-ats-text">{value}</dd>
          </div>
        ))}
      </dl>
      {option.fitmentNote ? (
        <p className="mt-2 text-xs font-semibold leading-5 text-ats-muted">
          {option.fitmentNote}
        </p>
      ) : null}
      {option.wheelSpecification ? (
        <p className="mt-2 text-xs font-semibold leading-5 text-ats-muted">
          Jant uygunluğu araç, ebat, ET/ofset ve lastik ölçüsüne göre ayrıca doğrulanmalıdır.
        </p>
      ) : null}
      {warning ? (
        <p className="mt-2 rounded-md border border-amber-300/30 bg-amber-500/10 px-2 py-1 text-xs font-bold leading-5 text-amber-100">
          {warning}
        </p>
      ) : null}
      {tuningNotes.length > 0 ? (
        <ul className="mt-2 grid gap-1 text-xs font-semibold leading-5 text-ats-muted">
          {tuningNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
      {option.tuningPackageSpecification ? (
        <p className="mt-2 text-xs font-semibold leading-5 text-ats-muted">
          Üretici beyanı ve ATS kalibrasyon verisidir; dyno sonucu veya garanti edilen güç değildir.
        </p>
      ) : null}
    </div>
  );
}

function ProjectedRatingPreviewPanel({
  previewState,
  isPending,
  queuedCount,
}: {
  previewState: VehicleRatingPreviewState | null;
  isPending: boolean;
  queuedCount: number;
}) {
  if (queuedCount === 0) {
    return null;
  }

  if (isPending) {
    return (
      <div className="mt-4 rounded-md border border-ats-border bg-ats-surface p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-ats-blue">
          Projected Build Impact
        </p>
        <div className="mt-4 grid gap-2">
          <div className="h-4 w-36 animate-pulse rounded bg-white/10" />
          <div className="h-3 w-full animate-pulse rounded bg-white/10" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-white/10" />
        </div>
        <p className="mt-3 text-sm font-semibold text-ats-muted">
          Tahmini rating hesaplanıyor...
        </p>
      </div>
    );
  }

  if (!previewState) {
    return null;
  }

  if (!previewState.ok) {
    return (
      <div className="mt-4 rounded-md border border-red-300/30 bg-red-500/10 p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-red-100">
          Projected Build Impact
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-red-100">
          {previewState.message ?? "Seçim çakışma içeriyor."}
        </p>
      </div>
    );
  }

  if (!previewState.currentRating || !previewState.projectedRating) {
    return (
      <div className="mt-4 rounded-md border border-ats-border bg-ats-surface p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-ats-blue">
          Projected Build Impact
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-ats-muted">
          {previewState.message ??
            "Bu araç platformu için tahmini ATS Rating mevcut değil."}
        </p>
      </div>
    );
  }

  const overallDelta = ratingDelta(
    previewState.currentRating.overall,
    previewState.projectedRating.overall,
  );

  return (
    <div className="mt-4 rounded-md border border-ats-blue/30 bg-ats-blue/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-ats-blue">
            Projected Build Impact
          </p>
          <p className="mt-2 text-xs font-semibold text-ats-muted">
            Tahmini değer. Build kaydedildikten sonra ATS Rating yeniden hesaplanır.
          </p>
        </div>
        <div className="grid gap-2 rounded-md border border-ats-border bg-ats-black px-3 py-2 sm:min-w-[220px]">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] font-black uppercase tracking-[0.12em] text-ats-muted">
              Mevcut ATS Rating
            </span>
            <span className="text-lg font-black text-ats-text">
              {previewState.currentRating.overall}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] font-black uppercase tracking-[0.12em] text-ats-muted">
              Tahmini ATS Rating
            </span>
            <span className="whitespace-nowrap text-lg font-black text-ats-text">
              {previewState.projectedRating.overall} <DeltaBadge delta={overallDelta} />
            </span>
          </div>
        </div>
      </div>

      <dl className="mt-4 grid gap-2">
        {ratingComponentRows.map(([label, key]) => {
          const currentValue = previewState.currentRating![key];
          const projectedValue = previewState.projectedRating![key];
          const delta = ratingDelta(currentValue, projectedValue);

          return (
            <div
              key={key}
              className="grid gap-2 rounded border border-ats-border bg-ats-black px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <dt className="min-w-0 text-xs font-black uppercase tracking-[0.12em] text-ats-muted">
                {label}
              </dt>
              <dd className="flex flex-wrap items-center gap-2 text-sm font-black text-ats-text">
                <span>{currentValue}</span>
                <span className="text-ats-muted">→</span>
                <span>{projectedValue}</span>
                <DeltaBadge delta={delta} />
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  const tone = ratingDeltaTone(delta);

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-black ${deltaToneClass(tone)}`}
    >
      {formatRatingDelta(delta)}
    </span>
  );
}

function deltaToneClass(tone: RatingDeltaTone) {
  if (tone === "positive") {
    return "border-emerald-300/30 bg-emerald-500/10 text-emerald-100";
  }

  if (tone === "negative") {
    return "border-red-300/30 bg-red-500/10 text-red-100";
  }

  return "border-ats-border bg-ats-black text-ats-muted";
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
    disabled?: boolean;
  }>;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-ats-muted">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-md border border-ats-border bg-ats-black px-3 text-sm font-semibold text-ats-text outline-none transition focus:border-ats-blue focus:ring-2 focus:ring-ats-blue/20"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled ?? false}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function optionByDefinitionId(
  catalogGroups: ModificationCatalogGroup[],
  definitionId: string,
) {
  for (const group of catalogGroups) {
    for (const type of group.types) {
      const option = type.options.find(
        (candidate) => candidate.definitionId === definitionId,
      );

      if (option) {
        return option;
      }
    }
  }

  return null;
}

function availabilityLabel(availability: "AVAILABLE" | "INSTALLED" | "BLOCKED") {
  if (availability === "INSTALLED") {
    return "Zaten yüklü";
  }

  if (availability === "BLOCKED") {
    return "Şu anda eklenemez";
  }

  return "Eklenebilir";
}

function usageClassLabel(value?: string | null) {
  const labels: Record<string, string> = {
    STREET: "Yol",
    FAST_ROAD: "Hızlı yol",
    STREET_TRACK: "Yol / pist",
    TRACK: "Pist",
    ENDURANCE: "Dayanıklılık",
    SPRINT: "Sprint",
    RACE: "Yarış",
  };

  return value ? labels[value] ?? value : "Belirtilmedi";
}

function tuningPackageTypeLabel(value: string) {
  const labels: Record<string, string> = {
    ECU_FLASH: "ECU flash",
    PIGGYBACK: "Piggyback",
    ECU_TCU_BUNDLE: "ECU + TCU",
    TCU_SOFTWARE: "TCU yazılımı",
    FLEX_FUEL_CALIBRATION: "Flex fuel kalibrasyon",
    HARDWARE_SOFTWARE_PACKAGE: "Donanım + yazılım",
  };

  return labels[value] ?? value;
}

function powerMeasurementBasisLabel(value?: string | null) {
  if (!value || value === "UNSPECIFIED") {
    return "Belirtilmedi";
  }

  const labels: Record<string, string> = {
    CRANK: "Krank",
    WHEEL: "Teker",
  };

  return labels[value] ?? value;
}

function calibrationConfidenceLabel(value: string) {
  const labels: Record<string, string> = {
    HIGH: "Yüksek",
    MEDIUM: "Orta",
    LOW: "Düşük",
  };

  return labels[value] ?? value;
}

function formatRange(min: number | null, max: number | null, unit: string) {
  if (min !== null && max !== null && min !== max) {
    return `${min}-${max} ${unit}`;
  }

  return `${min ?? max ?? "-"} ${unit}`;
}

function tyreClassLabel(value: string) {
  const labels: Record<string, string> = {
    TOURING: "Touring",
    UHP_ROAD: "UHP yol",
    MAX_PERFORMANCE_ROAD: "Max performance",
    EXTREME_PERFORMANCE: "Extreme performance",
    TRACKDAY: "Trackday",
    SEMI_SLICK: "Semi-slick",
    SLICK: "Slick",
    WET_RACING: "Yağmur yarış",
  };

  return labels[value] ?? value;
}

function wheelConstructionLabel(value: string) {
  const labels: Record<string, string> = {
    CAST: "Döküm",
    FLOW_FORMED: "Flow formed",
    FORGED: "Dövme",
    MULTI_PIECE: "Çok parçalı",
  };

  return labels[value] ?? value;
}

function bigBrakeKitAxleLabel(value: string) {
  const labels: Record<string, string> = {
    FRONT: "Ön",
    REAR: "Arka",
    BOTH: "Ön / arka",
  };

  return labels[value] ?? value;
}

function rotorConstructionLabel(value?: string | null) {
  if (!value) {
    return "Belirsiz";
  }

  const labels: Record<string, string> = {
    ONE_PIECE: "Tek parça",
    TWO_PIECE_FLOATING: "İki parçalı floating",
  };

  return labels[value] ?? value;
}
