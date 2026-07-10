import { normalizePlateNumber } from "@/lib/registration-validation";

const currentYear = new Date().getFullYear();
const maxVehicleYear = currentYear + 1;

export type VehicleInput = {
  brand: string;
  model: string;
  year: number | null;
  plateNumber: string;
  color: string | null;
  isPrimary: boolean;
};

export type VehicleValidationResult =
  | {
      ok: true;
      data: VehicleInput;
    }
  | {
      ok: false;
    };

export function parseVehicleForm(formData: FormData): VehicleValidationResult {
  const brand = normalizeText(formData.get("brand"), 60);
  const model = normalizeText(formData.get("model"), 80);
  const plateNumber = normalizeVehiclePlate(formData.get("plateNumber"));
  const color = normalizeOptionalText(formData.get("color"), 40);
  const year = parseVehicleYear(formData.get("year"));
  const isPrimary = formData.get("isPrimary") === "on";

  if (
    !brand ||
    brand.length < 2 ||
    !model ||
    !plateNumber ||
    year === undefined ||
    color === undefined
  ) {
    return {
      ok: false,
    };
  }

  return {
    ok: true,
    data: {
      brand,
      model,
      year,
      plateNumber,
      color,
      isPrimary,
    },
  };
}

function normalizeVehiclePlate(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = normalizePlateNumber(value);

  return normalized || null;
}

function normalizeText(value: FormDataEntryValue | null, maxLength: number) {
  const normalized = normalizeOptionalText(value, maxLength);

  if (!normalized) {
    return null;
  }

  return normalized;
}

function normalizeOptionalText(value: FormDataEntryValue | null, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    return undefined;
  }

  return normalized;
}

function parseVehicleYear(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  if (!/^\d{4}$/.test(value.trim())) {
    return undefined;
  }

  const year = Number(value);

  if (!Number.isInteger(year) || year < 1950 || year > maxVehicleYear) {
    return undefined;
  }

  return year;
}
