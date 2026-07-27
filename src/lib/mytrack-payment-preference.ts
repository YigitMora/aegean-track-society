export const myTrackPaymentPreferenceValues = [
  "BANK_TRANSFER",
  "CARD_AT_TRACK",
] as const;

export type MyTrackPaymentPreference =
  (typeof myTrackPaymentPreferenceValues)[number];

export const myTrackPaymentPreferenceOptions = [
  { code: "BANK_TRANSFER", label: "MyTrack’e EFT / havale" },
  { code: "CARD_AT_TRACK", label: "Pistte kredi kartı" },
] as const satisfies ReadonlyArray<{
  code: MyTrackPaymentPreference;
  label: string;
}>;

export const legacyMyTrackPaymentPreferenceLabel =
  "Belirtilmedi — eski kayıt";

export function isMyTrackPaymentPreference(
  value: unknown,
): value is MyTrackPaymentPreference {
  return (
    typeof value === "string" &&
    myTrackPaymentPreferenceValues.includes(
      value as MyTrackPaymentPreference,
    )
  );
}

export function myTrackPaymentPreferenceLabel(
  value: MyTrackPaymentPreference | null | undefined,
) {
  return (
    myTrackPaymentPreferenceOptions.find((option) => option.code === value)
      ?.label ?? legacyMyTrackPaymentPreferenceLabel
  );
}
