"use client";

import { useId, useMemo, useState } from "react";
import {
  getCatalogVehicleYearOptions,
  getManualVehicleYearOptions,
} from "@/lib/vehicle-year-contract";
import {
  buildVehicleCatalogHierarchy,
  findVehicleCatalogPath,
  searchVehicleCatalogDefinitions,
  type VehicleCatalogDefinitionInput,
  type VehicleCatalogHierarchy,
  type VehicleCatalogPath,
} from "@/lib/vehicle-catalog-hierarchy";

export type VehicleTemplateOption = {
  id: string;
  code?: string;
  brand: string;
  model: string;
  generation: string | null;
  chassisCode: string | null;
  variant: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  engineFamily?: {
    name: string;
  } | null;
};

type VehicleTemplateFieldsProps = {
  definitions: VehicleTemplateOption[];
  currentVehicleDefinitionId?: string | null;
  defaultBrand?: string;
  defaultModel?: string;
  defaultYear?: number | null;
  defaultMode?: "catalog" | "manual";
};

export function VehicleTemplateFields({
  definitions,
  currentVehicleDefinitionId,
  defaultBrand = "",
  defaultModel = "",
  defaultYear = null,
  defaultMode,
}: VehicleTemplateFieldsProps) {
  const initialDefinition =
    definitions.find((definition) => definition.id === currentVehicleDefinitionId) ??
    definitions[0] ??
    null;
  const catalogDefinitions = useMemo(
    () => definitions.map(toCatalogDefinition),
    [definitions],
  );
  const hierarchy = useMemo(
    () => buildVehicleCatalogHierarchy(catalogDefinitions),
    [catalogDefinitions],
  );
  const [mode, setMode] = useState<"catalog" | "manual">(
    defaultMode ??
      (currentVehicleDefinitionId ? "catalog" : definitions.length ? "catalog" : "manual"),
  );
  const [definitionId, setDefinitionId] = useState(initialDefinition?.id ?? "");
  const [year, setYear] = useState(
    initialDefinition ? defaultYearForDefinition(initialDefinition, defaultYear) : "",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const searchResultsId = useId();
  const selectedPath =
    findVehicleCatalogPath(hierarchy, definitionId) ?? firstCatalogPath(hierarchy);
  const selectedDefinition =
    definitions.find(
      (definition) =>
        definition.id === selectedPath?.variant.vehicleDefinitionId,
    ) ?? initialDefinition;
  const selectedBrand = hierarchy.brands.find(
    (brand) => brand.name === selectedPath?.brand,
  );
  const selectedModel = selectedBrand?.models.find(
    (model) => model.name === selectedPath?.modelFamily,
  );
  const selectedGeneration = selectedModel?.generations.find(
    (generation) => generation.name === selectedPath?.generation,
  );
  const searchResults = useMemo(
    () =>
      searchQuery.trim().length >= 2
        ? searchVehicleCatalogDefinitions(catalogDefinitions, searchQuery).slice(0, 8)
        : [],
    [catalogDefinitions, searchQuery],
  );
  const selectedDefinitionId = selectedPath?.variant.vehicleDefinitionId ?? "";
  const yearOptions = selectedDefinition ? yearsForDefinition(selectedDefinition) : [];
  const selectedYear = yearOptions.includes(year)
    ? year
    : selectedDefinition
      ? defaultYearForDefinition(selectedDefinition, defaultYear)
      : "";
  if (definitions.length === 0) {
    return (
      <ManualVehicleFields
        defaultBrand={defaultBrand}
        defaultModel={defaultModel}
        defaultYear={defaultYear}
      />
    );
  }

  return (
    <div className="sm:col-span-2">
      <div className="mb-5 flex flex-wrap gap-2">
        <ModeButton
          label="Katalogdan seç"
          active={mode === "catalog"}
          onClick={() => setMode("catalog")}
        />
        <ModeButton
          label="Aracım listede yok"
          active={mode === "manual"}
          onClick={() => setMode("manual")}
        />
      </div>

      {mode === "catalog" ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <input type="hidden" name="vehicleDefinitionId" value={selectedDefinitionId} />
          <input type="hidden" name="brand" value={selectedDefinition?.brand ?? ""} />
          <input type="hidden" name="model" value={selectedDefinition?.model ?? ""} />
          <input type="hidden" name="year" value={selectedYear} />

          <CatalogSearch
            query={searchQuery}
            results={searchResults}
            hierarchy={hierarchy}
            resultsId={searchResultsId}
            onQueryChange={setSearchQuery}
            onSelect={(vehicleDefinitionId) => {
              applyDefinitionSelection(vehicleDefinitionId);
              setSearchQuery("");
            }}
          />
          <SelectField
            label="Marka"
            value={selectedPath?.brand ?? ""}
            onChange={(value) => {
              applyHierarchySelection({ brand: value });
            }}
            options={hierarchy.brands.map((brand) => ({
              label: brand.name,
              value: brand.name,
            }))}
          />
          {selectedBrand && selectedBrand.models.length > 1 ? (
            <SelectField
              label="Model"
              value={selectedPath?.modelFamily ?? ""}
              onChange={(value) => {
                applyHierarchySelection({
                  brand: selectedBrand.name,
                  modelFamily: value,
                });
              }}
              options={selectedBrand.models.map((model) => ({
                label: model.name,
                value: model.name,
              }))}
            />
          ) : null}
          {selectedModel && selectedModel.generations.length > 1 ? (
            <SelectField
              label="Kasa / Nesil"
              value={selectedPath?.generation ?? ""}
              onChange={(value) => {
                applyHierarchySelection({
                  brand: selectedPath?.brand,
                  modelFamily: selectedModel.name,
                  generation: value,
                });
              }}
              options={selectedModel.generations.map((generation) => ({
                label: generation.name,
                value: generation.name,
              }))}
            />
          ) : null}
          {selectedGeneration && selectedGeneration.variants.length > 1 ? (
            <SelectField
              label="Motor / Versiyon"
              value={selectedDefinitionId}
              onChange={applyDefinitionSelection}
              options={selectedGeneration.variants.map((variant) => ({
                label: variant.label,
                value: variant.vehicleDefinitionId,
              }))}
            />
          ) : null}
          <SelectField
            label="Yıl"
            value={selectedYear}
            onChange={setYear}
            options={yearOptions.map((value) => ({ label: value, value }))}
          />
          {selectedDefinition ? (
            <div className="sm:col-span-2 rounded-md border border-ats-border bg-ats-black px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-ats-muted">
                Seçili platform
              </p>
              <p className="mt-2 text-sm font-black text-ats-text">
                {selectedPath ? catalogPathSummary(selectedPath) : ""}
                {selectedYear ? ` · ${selectedYear}` : ""}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <input type="hidden" name="vehicleDefinitionId" value="" />
          <ManualVehicleFields
            defaultBrand={defaultBrand}
            defaultModel={defaultModel}
            defaultYear={defaultYear}
          />
        </>
      )}
    </div>
  );

  function applyDefinitionSelection(nextDefinitionId: string) {
    const definition = definitions.find(
      (candidate) => candidate.id === nextDefinitionId,
    );

    if (!definition) {
      return;
    }

    setDefinitionId(definition.id);
    setYear(defaultYearForDefinition(definition, defaultYear));
  }

  function applyHierarchySelection({
    brand,
    modelFamily,
    generation,
  }: {
    brand?: string;
    modelFamily?: string;
    generation?: string;
  }) {
    const nextBrand =
      hierarchy.brands.find((candidate) => candidate.name === brand) ??
      hierarchy.brands[0];
    const nextModel =
      nextBrand?.models.find(
        (candidate) =>
          candidate.name === (modelFamily ?? selectedPath?.modelFamily),
      ) ?? nextBrand?.models[0];
    const nextGeneration =
      nextModel?.generations.find(
        (candidate) =>
          candidate.name === (generation ?? selectedPath?.generation),
      ) ?? nextModel?.generations[0];
    const nextVariant =
      nextGeneration?.variants.find(
        (candidate) => candidate.label === selectedPath?.variant.label,
      ) ?? nextGeneration?.variants[0];

    if (nextVariant) {
      applyDefinitionSelection(nextVariant.vehicleDefinitionId);
    }
  }
}

function CatalogSearch({
  query,
  results,
  hierarchy,
  resultsId,
  onQueryChange,
  onSelect,
}: {
  query: string;
  results: VehicleCatalogDefinitionInput[];
  hierarchy: VehicleCatalogHierarchy;
  resultsId: string;
  onQueryChange: (value: string) => void;
  onSelect: (vehicleDefinitionId: string) => void;
}) {
  return (
    <div className="sm:col-span-2">
      <label className="block">
        <span className="text-sm font-bold text-ats-text">Katalogda ara</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          autoComplete="off"
          aria-controls={resultsId}
          className="mt-2 h-12 w-full rounded-md border border-ats-border bg-ats-black px-3 text-sm font-semibold text-ats-text outline-none transition placeholder:text-ats-muted/60 focus:border-ats-blue focus:ring-2 focus:ring-ats-blue/20"
        />
      </label>
      {results.length > 0 ? (
        <div
          id={resultsId}
          className="mt-2 divide-y divide-ats-border overflow-hidden rounded-md border border-ats-border bg-ats-black"
        >
          <p className="px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-ats-muted">
            Hızlı seçim
          </p>
          {results.map((definition) => {
            const path = findVehicleCatalogPath(hierarchy, definition.id);

            return (
              <button
                key={definition.id}
                type="button"
                onClick={() => onSelect(definition.id)}
                className="block w-full px-3 py-3 text-left transition hover:bg-ats-surface focus:bg-ats-surface focus:outline-none"
              >
                <span className="block text-sm font-black text-ats-text">
                  {path ? catalogPathSummary(path) : definition.model}
                </span>
                <span className="mt-1 block break-all font-mono text-[11px] text-ats-muted">
                  {definition.code}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ManualVehicleFields({
  defaultBrand,
  defaultModel,
  defaultYear,
}: {
  defaultBrand: string;
  defaultModel: string;
  defaultYear: number | null;
}) {
  const [year, setYear] = useState(defaultYear ? String(defaultYear) : "");

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField label="Marka" name="brand" defaultValue={defaultBrand} required />
      <TextField label="Model" name="model" defaultValue={defaultModel} required />
      <SelectField
        label="Model yılı"
        value={year}
        onChange={setYear}
        required={false}
        name="year"
        options={[
          { label: "Belirtilmedi", value: "" },
          ...getManualVehicleYearOptions().map((year) => ({
            label: String(year),
            value: String(year),
          })),
        ]}
      />
    </div>
  );
}

function ModeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 rounded-full border px-4 text-xs font-black uppercase tracking-[0.12em] transition ${
        active
          ? "border-ats-blue bg-ats-blue text-ats-black"
          : "border-ats-border bg-ats-black text-ats-muted hover:border-ats-blue hover:text-ats-blue"
      }`}
    >
      {label}
    </button>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  name,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  name?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ats-text">{label}</span>
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-2 h-12 w-full rounded-md border border-ats-border bg-ats-black px-3 text-sm font-semibold text-ats-text outline-none transition focus:border-ats-blue focus:ring-2 focus:ring-ats-blue/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  label,
  name,
  type = "text",
  defaultValue,
  inputMode,
  min,
  max,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue: string;
  inputMode?: "numeric";
  min?: string;
  max?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ats-text">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        inputMode={inputMode}
        min={min}
        max={max}
        autoComplete="off"
        className="mt-2 h-12 w-full rounded-md border border-ats-border bg-ats-black px-3 text-sm font-semibold text-ats-text outline-none transition placeholder:text-ats-muted/60 focus:border-ats-blue focus:ring-2 focus:ring-ats-blue/20"
      />
    </label>
  );
}

function yearsForDefinition(definition: VehicleTemplateOption) {
  const options = getCatalogVehicleYearOptions(definition);
  return options.ok ? options.years.map(String) : [];
}

function defaultYearForDefinition(
  definition: VehicleTemplateOption,
  defaultYear: number | null,
) {
  const yearOptions = yearsForDefinition(definition);

  if (defaultYear && yearOptions.includes(String(defaultYear))) {
    return String(defaultYear);
  }

  return yearOptions[0] ?? "";
}

function toCatalogDefinition(
  definition: VehicleTemplateOption,
): VehicleCatalogDefinitionInput {
  return {
    ...definition,
    code: definition.code ?? definition.id,
  };
}

function firstCatalogPath(hierarchy: VehicleCatalogHierarchy) {
  const brand = hierarchy.brands[0];
  const model = brand?.models[0];
  const generation = model?.generations[0];
  const variant = generation?.variants[0];

  return brand && model && generation && variant
    ? {
        brand: brand.name,
        modelFamily: model.name,
        generation: generation.name,
        variant,
      }
    : null;
}

function catalogPathSummary(path: VehicleCatalogPath) {
  return [path.brand, path.modelFamily, path.generation, path.variant.label].join(
    " · ",
  );
}
