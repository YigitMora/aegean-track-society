"use client";

import type { ReactNode } from "react";
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

type TurkishPhoneInputProps = {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
  error?: ReactNode;
};

const inputClassName =
  "mt-2 h-12 w-full rounded-md border border-ats-border bg-ats-black px-3 text-sm font-semibold text-ats-text outline-none transition placeholder:text-ats-muted/60 focus:border-ats-blue focus:ring-2 focus:ring-ats-blue/20";

export function TurkishPhoneInput({
  label,
  name,
  defaultValue,
  placeholder = "+90 5xx xxx xx xx",
  required = false,
  error,
}: TurkishPhoneInputProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [caretDigitCount, setCaretDigitCount] = useState<number | null>(null);
  const [value, setValue] = useState(() =>
    formatTurkishMobileNumber(extractTurkishMobileDigits(defaultValue ?? "")),
  );
  const errorId = `${inputId}-error`;
  const describedBy = error ? errorId : undefined;

  useLayoutEffect(() => {
    if (caretDigitCount === null) {
      return;
    }

    const input = inputRef.current;

    if (!input || document.activeElement !== input) {
      setCaretDigitCount(null);
      return;
    }

    const nextPosition = caretPositionForNationalDigitCount(value, caretDigitCount);
    input.setSelectionRange(nextPosition, nextPosition);
    setCaretDigitCount(null);
  }, [caretDigitCount, value]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const rawValue = event.currentTarget.value;
    const cursorPosition = event.currentTarget.selectionStart ?? rawValue.length;
    const digitsBeforeCursor = extractTurkishMobileDigits(
      rawValue.slice(0, cursorPosition),
    ).length;
    const nextValue = formatTurkishPhoneInputValue(rawValue);
    const nationalDigits = extractTurkishMobileDigits(rawValue);

    setCaretDigitCount(Math.min(digitsBeforeCursor, nationalDigits.length));
    setValue(nextValue);
  }

  return (
    <label className="block" htmlFor={inputId}>
      <span className="text-sm font-bold text-ats-text">{label}</span>
      <input
        ref={inputRef}
        id={inputId}
        name={name}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required={required}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={inputClassName}
      />
      {error ? (
        <span id={errorId} className="mt-2 block text-xs font-semibold text-ats-blue">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function formatTurkishMobileNumber(nationalDigits: string) {
  const digits = nationalDigits.slice(0, 10);

  if (!digits) {
    return "";
  }

  const groups = [
    digits.slice(0, 3),
    digits.slice(3, 6),
    digits.slice(6, 8),
    digits.slice(8, 10),
  ].filter(Boolean);

  return `+90 ${groups.join(" ")}`;
}

export function extractTurkishMobileDigits(value: string) {
  return phoneInputStateFromValue(value).nationalDigits;
}

function formatTurkishPhoneInputValue(value: string) {
  const state = phoneInputStateFromValue(value);

  if (state.nationalDigits) {
    return formatTurkishMobileNumber(state.nationalDigits);
  }

  return state.showCountryPrefix ? "+90 " : "";
}

function phoneInputStateFromValue(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return {
      nationalDigits: "",
      showCountryPrefix: false,
    };
  }

  let nationalDigits = digits;
  let showCountryPrefix = false;

  if (nationalDigits.startsWith("90")) {
    showCountryPrefix = true;
    nationalDigits = nationalDigits.slice(2);
  } else if (nationalDigits.startsWith("0")) {
    showCountryPrefix = true;
    nationalDigits = nationalDigits.slice(1);
  } else if (nationalDigits.startsWith("9")) {
    showCountryPrefix = true;
    nationalDigits = "";
  }

  if (nationalDigits.startsWith("0")) {
    nationalDigits = nationalDigits.slice(1);
  }

  if (!nationalDigits.startsWith("5")) {
    return {
      nationalDigits: "",
      showCountryPrefix,
    };
  }

  return {
    nationalDigits: nationalDigits.slice(0, 10),
    showCountryPrefix,
  };
}

function caretPositionForNationalDigitCount(value: string, nationalDigitCount: number) {
  if (!value || nationalDigitCount <= 0) {
    return value ? "+90 ".length : 0;
  }

  let seenNationalDigits = 0;

  for (let index = "+90 ".length; index < value.length; index += 1) {
    if (/\d/.test(value[index])) {
      seenNationalDigits += 1;
    }

    if (seenNationalDigits >= nationalDigitCount) {
      return index + 1;
    }
  }

  return value.length;
}
