import type { Prisma } from "@prisma/client";

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Istanbul",
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "Europe/Istanbul",
});

export function formatDateTime(value?: Date | null) {
  return value ? dateTimeFormatter.format(value) : "-";
}

export function formatDateOnly(value?: Date | null) {
  return value ? dateFormatter.format(value) : "-";
}

export function formatStatus(value?: string | null) {
  if (!value) {
    return "-";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatCurrency(value: Prisma.Decimal, currency: string) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value.toNumber());
}
