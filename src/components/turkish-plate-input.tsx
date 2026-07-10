"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

type TurkishPlateInputProps = {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
};

const inputClassName =
  "mt-2 h-12 w-full rounded-md border border-ats-border bg-ats-black px-3 text-sm font-semibold text-ats-text outline-none transition placeholder:text-ats-muted/60 focus:border-ats-blue focus:ring-2 focus:ring-ats-blue/20";
const allowedLetterPattern = /[A-ZÇĞİÖŞÜ]/;
const allowedNonSpacePattern = /[0-9A-ZÇĞİÖŞÜ]/;
const inferablePlatePattern = /^(\d{2})([A-ZÇĞİÖŞÜ]{1,3})(\d{1,4})$/;

export function TurkishPlateInput({
  label,
  name,
  defaultValue,
  required = false,
}: TurkishPlateInputProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [caretTokenCount, setCaretTokenCount] = useState<number | null>(null);
  const [value, setValue] = useState(() => normalizeTurkishPlateInput(defaultValue ?? ""));

  useLayoutEffect(() => {
    if (caretTokenCount === null) {
      return;
    }

    const input = inputRef.current;

    if (!input || document.activeElement !== input) {
      setCaretTokenCount(null);
      return;
    }

    const nextPosition = caretPositionForTokenCount(value, caretTokenCount);
    input.setSelectionRange(nextPosition, nextPosition);
    setCaretTokenCount(null);
  }, [caretTokenCount, value]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const rawValue = event.currentTarget.value;
    const cursorPosition = event.currentTarget.selectionStart ?? rawValue.length;
    const tokenCountBeforeCursor = countPlateTokens(rawValue.slice(0, cursorPosition));

    setCaretTokenCount(tokenCountBeforeCursor);
    setValue(normalizeTurkishPlateInput(rawValue));
  }

  return (
    <label className="block" htmlFor={inputId}>
      <span className="text-sm font-bold text-ats-text">{label}</span>
      <input
        ref={inputRef}
        id={inputId}
        name={name}
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        required={required}
        value={value}
        onChange={handleChange}
        className={inputClassName}
      />
    </label>
  );
}

export function normalizeTurkishPlateInput(value: string) {
  const cleaned = cleanPlateText(value);
  const compact = cleaned.replace(/\s+/g, "");
  const inferred = inferablePlatePattern.exec(compact);

  if (inferred) {
    return `${inferred[1]} ${inferred[2]} ${inferred[3]}`;
  }

  return cleaned;
}

function cleanPlateText(value: string) {
  const normalized = value
    .toLocaleUpperCase("tr-TR")
    .normalize("NFC");
  let cleaned = "";
  let lastWasSpace = false;

  for (const character of normalized) {
    if (/[0-9]/.test(character) || allowedLetterPattern.test(character)) {
      cleaned += character;
      lastWasSpace = false;
      continue;
    }

    if (/\s/.test(character) && cleaned && !lastWasSpace) {
      cleaned += " ";
      lastWasSpace = true;
    }
  }

  return cleaned.trim();
}

function countPlateTokens(value: string) {
  return cleanPlateText(value)
    .replace(/\s+/g, "")
    .split("")
    .filter((character) => allowedNonSpacePattern.test(character)).length;
}

function caretPositionForTokenCount(value: string, tokenCount: number) {
  if (tokenCount <= 0) {
    return 0;
  }

  let seenTokens = 0;

  for (let index = 0; index < value.length; index += 1) {
    if (allowedNonSpacePattern.test(value[index])) {
      seenTokens += 1;
    }

    if (seenTokens >= tokenCount) {
      return index + 1;
    }
  }

  return value.length;
}
