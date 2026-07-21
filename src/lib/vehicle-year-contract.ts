export const minimumVehicleYear = 1950;

export type VehicleDefinitionYearRange = {
  yearFrom: number | null;
  yearTo: number | null;
};

export function getMaximumVehicleYear(currentYear = new Date().getFullYear()) {
  return currentYear + 1;
}

export function getManualVehicleYearOptions(
  currentYear = new Date().getFullYear(),
) {
  return buildDescendingYears(
    minimumVehicleYear,
    getMaximumVehicleYear(currentYear),
  );
}

export function getCatalogVehicleYearOptions(
  definition: VehicleDefinitionYearRange,
  currentYear = new Date().getFullYear(),
):
  | { ok: true; years: number[] }
  | { ok: false; reason: "missing_start" | "invalid_range" } {
  if (definition.yearFrom === null) {
    return { ok: false, reason: "missing_start" };
  }

  const maximumYear = getMaximumVehicleYear(currentYear);
  const end = Math.min(definition.yearTo ?? maximumYear, maximumYear);
  if (definition.yearFrom < minimumVehicleYear || definition.yearFrom > end) {
    return { ok: false, reason: "invalid_range" };
  }

  return {
    ok: true,
    years: buildDescendingYears(definition.yearFrom, end),
  };
}

export function isCatalogVehicleYearAllowed(
  year: unknown,
  definition: VehicleDefinitionYearRange,
  currentYear = new Date().getFullYear(),
) {
  if (!Number.isInteger(year)) {
    return false;
  }

  const options = getCatalogVehicleYearOptions(definition, currentYear);
  return options.ok && options.years.includes(year as number);
}

function buildDescendingYears(start: number, end: number) {
  const years: number[] = [];
  for (let year = end; year >= start; year -= 1) {
    years.push(year);
  }
  return years;
}
