"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { VehicleModificationBatchActionState } from "@/app/account/garage/actions";

export type ModificationCatalogGroup = {
  category: string;
  categoryLabel: string;
  types: Array<{
    typeKey: string;
    typeLabel: string;
    options: Array<{
      definitionId: string;
      label: string;
      availability: "AVAILABLE" | "INSTALLED" | "BLOCKED";
      reason?: string;
    }>;
  }>;
};

type VehicleModificationBatchSelectorProps = {
  action: (
    state: VehicleModificationBatchActionState,
    formData: FormData,
  ) => Promise<VehicleModificationBatchActionState>;
  catalogGroups: ModificationCatalogGroup[];
};

const initialState: VehicleModificationBatchActionState = {
  ok: false,
  code: null,
  message: null,
  insertedCount: 0,
  submittedAt: 0,
};

export function VehicleModificationBatchSelector({
  action,
  catalogGroups,
}: VehicleModificationBatchSelectorProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [queuedDefinitionIds, setQueuedDefinitionIds] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(
    catalogGroups[0]?.category ?? "",
  );
  const selectedGroup =
    catalogGroups.find((group) => group.category === selectedCategory) ??
    catalogGroups[0] ??
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

  useEffect(() => {
    if (!state.ok || state.submittedAt === 0) {
      return;
    }

    setQueuedDefinitionIds([]);
    router.refresh();
  }, [router, state.ok, state.submittedAt]);

  if (catalogGroups.length === 0) {
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
              catalogGroups.find((group) => group.category === value) ?? catalogGroups[0];
            const nextType = nextGroup?.types[0] ?? null;
            const nextOption =
              nextType?.options.find((option) => option.availability === "AVAILABLE") ??
              nextType?.options[0] ??
              null;

            setSelectedCategory(nextGroup?.category ?? "");
            setSelectedTypeKey(nextType?.typeKey ?? "");
            setSelectedDefinitionId(nextOption?.definitionId ?? "");
          }}
          options={catalogGroups.map((group) => ({
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
          className="h-11 rounded-full bg-ats-blue px-5 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover disabled:cursor-not-allowed disabled:border disabled:border-ats-border disabled:bg-ats-black disabled:text-ats-muted"
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
            className="inline-flex h-11 items-center justify-center rounded-full bg-ats-blue px-5 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover disabled:cursor-not-allowed disabled:border disabled:border-ats-border disabled:bg-ats-black disabled:text-ats-muted"
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
                className="grid gap-3 px-3 py-2 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <span className="min-w-0 truncate text-sm font-black text-ats-text">
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
      </form>
    </div>
  );
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
