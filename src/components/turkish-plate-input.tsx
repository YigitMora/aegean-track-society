"use client";

import { useId } from "react";

type TurkishPlateInputProps = {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
};

const inputClassName =
  "mt-2 h-12 w-full rounded-md border border-ats-border bg-ats-black px-3 text-sm font-semibold text-ats-text outline-none transition placeholder:text-ats-muted/60 focus:border-ats-blue focus:ring-2 focus:ring-ats-blue/20";

export function TurkishPlateInput({
  label,
  name,
  defaultValue,
  required = false,
}: TurkishPlateInputProps) {
  const inputId = useId();

  return (
    <label className="block" htmlFor={inputId}>
      <span className="text-sm font-bold text-ats-text">{label}</span>
      <input
        id={inputId}
        name={name}
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        required={required}
        defaultValue={defaultValue ?? ""}
        className={inputClassName}
      />
    </label>
  );
}
