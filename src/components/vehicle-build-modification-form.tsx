"use client";

import { useMemo, useState } from "react";

export type VehicleBuildCatalogGroup = {
  category: string;
  categoryLabel: string;
  typeKey: string;
  typeLabel: string;
  options: Array<{
    definitionId: string;
    label: string;
    available: boolean;
    reason: string | null;
  }>;
};

type VehicleBuildModificationFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  catalogGroups: VehicleBuildCatalogGroup[];
  returnTo: string;
};

export function VehicleBuildModificationForm({
  action,
  catalogGroups,
  returnTo,
}: VehicleBuildModificationFormProps) {
  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Map(
          catalogGroups.map((group) => [
            group.category,
            {
              value: group.category,
              label: group.categoryLabel,
            },
          ]),
        ).values(),
      ),
    [catalogGroups],
  );
  const [selectedCategory, setSelectedCategory] = useState(
    categoryOptions[0]?.value ?? "",
  );
  const groupsForCategory = catalogGroups.filter(
    (group) => group.category === selectedCategory,
  );
  const [selectedTypeKey, setSelectedTypeKey] = useState(
    groupsForCategory[0]?.typeKey ?? "",
  );
  const selectedType =
    groupsForCategory.find((group) => group.typeKey === selectedTypeKey) ??
    groupsForCategory[0] ??
    null;
  const firstOptionId = selectedType?.options[0]?.definitionId ?? "";
  const firstAvailableOptionId =
    selectedType?.options.find((option) => option.available)?.definitionId ??
    firstOptionId;
  const [selectedDefinitionId, setSelectedDefinitionId] = useState(
    firstAvailableOptionId,
  );
  const selectedOption =
    selectedType?.options.find((option) => option.definitionId === selectedDefinitionId) ??
    selectedType?.options.find((option) => option.definitionId === firstAvailableOptionId) ??
    selectedType?.options[0] ??
    null;
  const resolvedDefinitionId = selectedOption?.definitionId ?? "";
  const shouldShowOptionSelect = Boolean(selectedType && selectedType.options.length > 1);
  const canSubmit = Boolean(selectedOption?.available);

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="returnTo" value={returnTo} />
      {!shouldShowOptionSelect ? (
        <input type="hidden" name="modificationDefinitionId" value={resolvedDefinitionId} />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-ats-muted">
            Kategori
          </span>
          <select
            value={selectedCategory}
            onChange={(event) => {
              const nextCategory = event.target.value;
              const nextType = catalogGroups.find(
                (group) => group.category === nextCategory,
              );
              const nextOption =
                nextType?.options.find((option) => option.available) ??
                nextType?.options[0];

              setSelectedCategory(nextCategory);
              setSelectedTypeKey(nextType?.typeKey ?? "");
              setSelectedDefinitionId(nextOption?.definitionId ?? "");
            }}
            className="mt-2 h-11 w-full rounded-md border border-ats-border bg-ats-black px-3 text-sm font-semibold text-ats-text outline-none transition focus:border-ats-blue focus:ring-2 focus:ring-ats-blue/20"
          >
            {categoryOptions.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-ats-muted">
            Modifikasyon tipi
          </span>
          <select
            value={selectedType?.typeKey ?? ""}
            onChange={(event) => {
              const nextType = groupsForCategory.find(
                (group) => group.typeKey === event.target.value,
              );
              const nextOption =
                nextType?.options.find((option) => option.available) ??
                nextType?.options[0];

              setSelectedTypeKey(nextType?.typeKey ?? "");
              setSelectedDefinitionId(nextOption?.definitionId ?? "");
            }}
            className="mt-2 h-11 w-full rounded-md border border-ats-border bg-ats-black px-3 text-sm font-semibold text-ats-text outline-none transition focus:border-ats-blue focus:ring-2 focus:ring-ats-blue/20"
          >
            {groupsForCategory.map((group) => (
              <option key={group.typeKey} value={group.typeKey}>
                {group.typeLabel}
              </option>
            ))}
          </select>
        </label>

        {shouldShowOptionSelect ? (
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-ats-muted">
              Opsiyon
            </span>
            <select
              name="modificationDefinitionId"
              value={resolvedDefinitionId}
              onChange={(event) => setSelectedDefinitionId(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-ats-border bg-ats-black px-3 text-sm font-semibold text-ats-text outline-none transition focus:border-ats-blue focus:ring-2 focus:ring-ats-blue/20"
            >
              {selectedType?.options.map((option) => (
                <option
                  key={option.definitionId}
                  value={option.definitionId}
                  disabled={!option.available}
                >
                  {option.available
                    ? option.label
                    : `${option.label} - ${option.reason ?? "Uygun değil"}`}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="rounded-md border border-ats-border bg-ats-black px-3 py-3">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-ats-muted">
              Opsiyon
            </p>
            <p className="mt-1 text-sm font-black text-ats-text">
              {selectedOption?.label ?? "-"}
            </p>
          </div>
        )}
      </div>

      {selectedOption && !selectedOption.available ? (
        <p className="rounded-md border border-ats-border bg-ats-black px-4 py-3 text-sm font-semibold text-ats-muted">
          {selectedOption.reason ?? "Bu parça şu anda eklenemez."}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[1fr_180px_auto] md:items-end">
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-ats-muted">
            Opsiyonel not
          </span>
          <input
            name="customNotes"
            maxLength={280}
            placeholder="Örn. ön aks, yaz seti, servis notu"
            className="mt-2 h-11 w-full rounded-md border border-ats-border bg-ats-black px-3 text-sm font-semibold text-ats-text outline-none transition placeholder:text-ats-muted/60 focus:border-ats-blue focus:ring-2 focus:ring-ats-blue/20"
          />
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-ats-muted">
            Montaj tarihi
          </span>
          <input
            name="installedAt"
            type="date"
            className="mt-2 h-11 w-full rounded-md border border-ats-border bg-ats-black px-3 text-sm font-semibold text-ats-text outline-none transition focus:border-ats-blue focus:ring-2 focus:ring-ats-blue/20"
          />
        </label>
        <button
          type="submit"
          disabled={!canSubmit}
          className="h-11 rounded-full bg-ats-blue px-5 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover disabled:cursor-not-allowed disabled:border disabled:border-ats-border disabled:bg-ats-black disabled:text-ats-muted"
        >
          Parça ekle
        </button>
      </div>
    </form>
  );
}
