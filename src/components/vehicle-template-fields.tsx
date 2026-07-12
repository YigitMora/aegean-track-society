"use client";

import { useMemo, useState } from "react";

export type VehicleTemplateOption = {
  id: string;
  brand: string;
  model: string;
  generation: string | null;
  chassisCode: string | null;
  variant: string | null;
  yearFrom: number | null;
  yearTo: number | null;
};

type VehicleTemplateFieldsProps = {
  definitions: VehicleTemplateOption[];
  currentVehicleDefinitionId?: string | null;
  defaultBrand?: string;
  defaultModel?: string;
  defaultYear?: number | null;
  defaultMode?: "catalog" | "manual";
};

const maxVehicleYear = new Date().getFullYear() + 1;

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
  const [mode, setMode] = useState<"catalog" | "manual">(
    defaultMode ??
      (currentVehicleDefinitionId ? "catalog" : definitions.length ? "catalog" : "manual"),
  );
  const [brand, setBrand] = useState(initialDefinition?.brand ?? definitions[0]?.brand ?? "");
  const [model, setModel] = useState(initialDefinition?.model ?? "");
  const [generationKey, setGenerationKey] = useState(
    initialDefinition ? generationKeyForDefinition(initialDefinition) : "",
  );
  const [definitionId, setDefinitionId] = useState(initialDefinition?.id ?? "");
  const [year, setYear] = useState(
    initialDefinition ? defaultYearForDefinition(initialDefinition, defaultYear) : "",
  );

  const brandOptions = useMemo(
    () => Array.from(new Set(definitions.map((definition) => definition.brand))),
    [definitions],
  );
  const modelOptions = definitions
    .filter((definition) => definition.brand === brand)
    .map((definition) => definition.model)
    .filter((value, index, values) => values.indexOf(value) === index);
  const definitionsForModel = definitions.filter(
    (definition) => definition.brand === brand && definition.model === model,
  );
  const generationOptions = Array.from(
    new Map(
      definitionsForModel.map((definition) => [
        generationKeyForDefinition(definition),
        {
          value: generationKeyForDefinition(definition),
          label: generationLabelForDefinition(definition),
        },
      ]),
    ).values(),
  );
  const variantOptions = definitionsForModel.filter(
    (definition) => generationKeyForDefinition(definition) === generationKey,
  );
  const selectedDefinition =
    variantOptions.find((definition) => definition.id === definitionId) ??
    variantOptions[0] ??
    definitionsForModel[0] ??
    definitions[0] ??
    null;
  const selectedDefinitionId = selectedDefinition?.id ?? "";
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

          <SelectField
            label="Marka"
            value={brand}
            onChange={(value) => {
              const nextDefinition =
                definitions.find((definition) => definition.brand === value) ?? definitions[0];

              applyDefinitionSelection(nextDefinition);
            }}
            options={brandOptions.map((value) => ({ label: value, value }))}
          />
          <SelectField
            label="Model"
            value={model}
            onChange={(value) => {
              const nextDefinition =
                definitions.find(
                  (definition) =>
                    definition.brand === brand && definition.model === value,
                ) ?? definitions[0];

              applyDefinitionSelection(nextDefinition);
            }}
            options={modelOptions.map((value) => ({ label: value, value }))}
          />
          <SelectField
            label="Jenerasyon / kasa"
            value={generationKey}
            onChange={(value) => {
              const nextDefinition =
                definitionsForModel.find(
                  (definition) => generationKeyForDefinition(definition) === value,
                ) ?? definitionsForModel[0] ?? definitions[0];

              applyDefinitionSelection(nextDefinition);
            }}
            options={generationOptions}
          />
          <SelectField
            label="Versiyon"
            value={selectedDefinitionId}
            onChange={(value) => {
              const nextDefinition =
                definitions.find((definition) => definition.id === value) ?? selectedDefinition;

              if (nextDefinition) {
                applyDefinitionSelection(nextDefinition);
              }
            }}
            options={variantOptions.map((definition) => ({
              label: definition.variant ?? "Standart",
              value: definition.id,
            }))}
          />
          <SelectField
            label="Yıl"
            value={selectedYear}
            onChange={setYear}
            options={yearOptions.map((value) => ({ label: value, value }))}
          />
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

  function applyDefinitionSelection(definition: VehicleTemplateOption) {
    setBrand(definition.brand);
    setModel(definition.model);
    setGenerationKey(generationKeyForDefinition(definition));
    setDefinitionId(definition.id);
    setYear(defaultYearForDefinition(definition, defaultYear));
  }
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
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField label="Marka" name="brand" defaultValue={defaultBrand} required />
      <TextField label="Model" name="model" defaultValue={defaultModel} required />
      <TextField
        label="Model yılı"
        name="year"
        type="number"
        defaultValue={defaultYear ? String(defaultYear) : ""}
        inputMode="numeric"
        min="1950"
        max={String(maxVehicleYear)}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ats-text">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
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

function generationKeyForDefinition(definition: VehicleTemplateOption) {
  return [definition.generation, definition.chassisCode].filter(Boolean).join("|") || "default";
}

function generationLabelForDefinition(definition: VehicleTemplateOption) {
  return [definition.generation, definition.chassisCode].filter(Boolean).join(" / ") || "Standart";
}

function yearsForDefinition(definition: VehicleTemplateOption) {
  const start = definition.yearFrom ?? 1950;
  const end = Math.min(definition.yearTo ?? maxVehicleYear, maxVehicleYear);
  const years: string[] = [];

  for (let year = end; year >= start; year -= 1) {
    years.push(String(year));
  }

  return years;
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
