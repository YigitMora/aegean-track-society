import { TurkishPlateInput } from "@/components/turkish-plate-input";

type VehicleFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  vehicle?: {
    brand: string;
    model: string;
    year: number | null;
    plateNumber: string;
    color: string | null;
    isPrimary: boolean;
  };
  showPrimaryOption?: boolean;
  returnTo?: string;
};

export function VehicleForm({
  action,
  submitLabel,
  vehicle,
  showPrimaryOption = false,
  returnTo = "/account/garage",
}: VehicleFormProps) {
  return (
    <form
      action={action}
      className="rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft sm:p-8"
    >
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="grid gap-5 sm:grid-cols-2">
        <VehicleField
          label="Marka"
          name="brand"
          defaultValue={vehicle?.brand ?? ""}
          autoComplete="off"
          required
        />
        <VehicleField
          label="Model"
          name="model"
          defaultValue={vehicle?.model ?? ""}
          autoComplete="off"
          required
        />
        <VehicleField
          label="Model yılı"
          name="year"
          type="number"
          defaultValue={vehicle?.year ? String(vehicle.year) : ""}
          inputMode="numeric"
          min="1950"
          max={String(new Date().getFullYear() + 1)}
        />
        <TurkishPlateInput
          label="Plaka"
          name="plateNumber"
          defaultValue={vehicle?.plateNumber ?? ""}
          required
        />
        <VehicleField
          label="Renk"
          name="color"
          defaultValue={vehicle?.color ?? ""}
          autoComplete="off"
        />
      </div>

      {showPrimaryOption ? (
        <label className="mt-6 flex gap-3 text-sm font-semibold leading-6 text-ats-text">
          <input
            name="isPrimary"
            type="checkbox"
            defaultChecked={vehicle?.isPrimary ?? false}
            className="mt-1 h-4 w-4 rounded border-ats-border bg-ats-black accent-ats-blue"
          />
          <span>Birincil aracım</span>
        </label>
      ) : null}

      <button
        type="submit"
        className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-ats-blue px-6 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover focus:outline-none focus:ring-2 focus:ring-ats-blue/40"
      >
        {submitLabel}
      </button>
    </form>
  );
}

function VehicleField({
  label,
  name,
  type = "text",
  defaultValue,
  autoComplete,
  inputMode,
  min,
  max,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue: string;
  autoComplete?: string;
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
        autoComplete={autoComplete}
        inputMode={inputMode}
        min={min}
        max={max}
        className="mt-2 h-12 w-full rounded-md border border-ats-border bg-ats-black px-3 text-sm font-semibold text-ats-text outline-none transition placeholder:text-ats-muted/60 focus:border-ats-blue focus:ring-2 focus:ring-ats-blue/20"
      />
    </label>
  );
}
