"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useId, useState } from "react";
import { TurkishPhoneInput } from "@/components/turkish-phone-input";

type FieldErrors = Record<string, string[] | undefined>;

type RegistrationFormProps = {
  member: {
    fullName: string;
    email: string;
    phone: string;
  };
  vehicles: Array<{
    id: string;
    brand: string;
    model: string;
    plateNumber: string;
    isPrimary: boolean;
  }>;
  defaultVehicleId: string;
};

const experienceLevels = [
  { value: "INTERMEDIATE", label: "Daha önce pist deneyimim var" },
  { value: "BEGINNER", label: "İlk pist tecrübem olacak" },
];

const messageTranslations: Record<string, string> = {
  "Registration received. Redirecting to secure payment...":
    "Kayıt talebiniz alındı. Güvenli ödeme sayfasına yönlendiriliyorsunuz...",
  "Vehicle is required.": "Araç seçimi zorunludur.",
  "Driving experience level is required.": "Sürüş deneyimi seçimi zorunludur.",
  "Emergency contact name is required.": "Acil durum kişi adı zorunludur.",
  "Emergency contact name must be at least 2 characters.":
    "Acil durum kişi adı en az 2 karakter olmalıdır.",
  "Emergency contact name is too long.": "Acil durum kişi adı çok uzun.",
  "Emergency contact phone is required.": "Acil durum telefonu zorunludur.",
  "Enter a valid Turkish emergency contact phone number.":
    "Geçerli bir Türkiye acil durum telefonu girin.",
  "KVKK consent is required.": "KVKK onayı zorunludur.",
  "Liability waiver acceptance is required.": "Sorumluluk beyanı onayı zorunludur.",
};

export function RegistrationForm({
  member,
  vehicles,
  defaultVehicleId,
}: RegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});
    setFormMessage(null);
    let shouldKeepSubmitting = false;

    const formData = new FormData(event.currentTarget);
    const payload = {
      vehicleId: valueOf(formData, "vehicleId"),
      experienceLevel: valueOf(formData, "experienceLevel"),
      emergencyContactName: valueOf(formData, "emergencyContactName"),
      emergencyContactPhone: valueOf(formData, "emergencyContactPhone"),
      kvkkAccepted: formData.get("kvkkAccepted") === "on",
      liabilityWaiverAccepted: formData.get("liabilityWaiverAccepted") === "on",
    };

    try {
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await readJsonResponse(response);

      if (!response.ok) {
        setFieldErrors(data?.fieldErrors ?? {});
        setFormMessage(data?.message ?? fallbackMessageForStatus(response.status));
        return;
      }

      if (!data) {
        setFormMessage("Kayıt yanıtı okunamadı. Lütfen etkinlik ekibiyle iletişime geçin.");
        return;
      }

      if (data.paymentMode === "manual") {
        shouldKeepSubmitting = true;
        setFormMessage("Kayıt talebiniz alındı. Onay sayfasına yönlendiriliyorsunuz.");
        window.location.assign(
          data.successUrl ??
            `/registration/success?registrationId=${encodeURIComponent(data.registration?.id ?? "")}`,
        );
        return;
      }

      if (!data.paymentPageUrl) {
        setFormMessage("Güvenli ödeme başlatılamadı. Lütfen tekrar deneyin.");
        return;
      }

      shouldKeepSubmitting = true;
      setIsRedirecting(true);
      setFormMessage(
        translateMessage(data.message, "Güvenli ödeme sayfasına yönlendiriliyorsunuz..."),
      );
      window.location.assign(data.paymentPageUrl);
    } catch {
      setFormMessage(
        "Kayıt servisine ulaşılamadı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.",
      );
    } finally {
      if (!shouldKeepSubmitting) {
        setIsSubmitting(false);
      }
    }
  }

  if (isRedirecting) {
    return (
      <section className="rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-ats-blue">
          Güvenli ödeme
        </p>
        <h2 className="mt-3 text-3xl font-black text-ats-text">
          Güvenli ödeme sayfasına yönlendiriliyorsunuz...
        </h2>
        <p className="mt-4 text-sm leading-6 text-ats-muted">
          Kayıt talebiniz alındı. Ödeme adımını tamamlamak için iyzico sayfasına
          yönlendiriliyorsunuz.
        </p>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft sm:p-8"
    >
      <section className="rounded-md border border-ats-border bg-ats-black p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-ats-blue">
          Üye bilgileri
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <ReadOnlyInfo label="Ad soyad" value={member.fullName} />
          <ReadOnlyInfo label="E-posta" value={member.email} />
          <ReadOnlyInfo label="Telefon" value={member.phone} />
        </dl>
      </section>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-bold text-ats-text">Araç</span>
          <select
            name="vehicleId"
            required
            defaultValue={defaultVehicleId}
            className="mt-2 h-12 w-full rounded-md border border-ats-border bg-ats-black px-3 text-sm font-semibold text-ats-text outline-none transition focus:border-ats-blue"
          >
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.brand} {vehicle.model} · {vehicle.plateNumber}
                {vehicle.isPrimary ? " · Birincil" : ""}
              </option>
            ))}
          </select>
          <ErrorText message={fieldErrors.vehicleId?.[0]} />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-bold text-ats-text">Sürüş deneyimi</span>
          <select
            name="experienceLevel"
            required
            defaultValue=""
            className="mt-2 h-12 w-full rounded-md border border-ats-border bg-ats-black px-3 text-sm font-semibold text-ats-text outline-none transition focus:border-ats-blue"
          >
            <option value="" disabled>
              Seviye seçin
            </option>
            {experienceLevels.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
          <ErrorText message={fieldErrors.experienceLevel?.[0]} />
        </label>

        <Field
          label="Acil durum kişi adı"
          name="emergencyContactName"
          autoComplete="off"
          error={fieldErrors.emergencyContactName?.[0]}
        />
        <TurkishPhoneInput
          label="Acil durum telefonu"
          name="emergencyContactPhone"
          required
          error={
            fieldErrors.emergencyContactPhone?.[0]
              ? translateMessage(
                  fieldErrors.emergencyContactPhone[0],
                  fieldErrors.emergencyContactPhone[0],
                )
              : undefined
          }
        />
      </div>

      <div className="mt-8 space-y-4 border-t border-ats-border pt-6">
        <Checkbox
          name="kvkkAccepted"
          label={
            <>
              <LegalLink href="/legal/kvkk-aydinlatma">KVKK Aydınlatma Metni</LegalLink>
              {"'ni okudum ve etkinlik kaydı için kabul ediyorum."}
            </>
          }
          error={fieldErrors.kvkkAccepted?.[0]}
          required
        />
        <Checkbox
          name="liabilityWaiverAccepted"
          label={
            <>
              <LegalLink href="/legal/motorsporlari-katilim-beyani">
                Motorsporları Katılım ve Sorumluluk Beyanı
              </LegalLink>
              {"'nı okudum ve kabul ediyorum."}
            </>
          }
          error={fieldErrors.liabilityWaiverAccepted?.[0]}
          required
        />
      </div>

      {formMessage ? (
        <p className="mt-6 rounded-md border border-ats-blue/30 bg-ats-blue/10 px-4 py-3 text-sm font-semibold text-ats-text">
          {formMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-ats-blue px-6 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover disabled:cursor-not-allowed disabled:bg-ats-border disabled:text-ats-muted"
      >
        {isSubmitting ? "Başvuru gönderiliyor..." : "Başvuru gönder"}
      </button>
    </form>
  );
}

function ReadOnlyInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-[0.14em] text-ats-muted">
        {label}
      </dt>
      <dd className="mt-2 break-words text-sm font-black text-ats-text">{value}</dd>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ats-text">{label}</span>
      <input
        name={name}
        type={type}
        required
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-2 h-12 w-full rounded-md border border-ats-border bg-ats-black px-3 text-sm font-semibold text-ats-text outline-none transition placeholder:text-ats-muted/60 focus:border-ats-blue"
      />
      <ErrorText message={error} />
    </label>
  );
}

function Checkbox({
  name,
  label,
  error,
  required = false,
}: {
  name: string;
  label: ReactNode;
  error?: string;
  required?: boolean;
}) {
  const inputId = useId();

  return (
    <div className="flex gap-3">
      <input
        id={inputId}
        name={name}
        type="checkbox"
        required={required}
        className="mt-1 h-4 w-4 rounded border-ats-border bg-ats-black accent-ats-blue"
      />
      <span>
        <label htmlFor={inputId} className="block text-sm font-semibold leading-6 text-ats-text">
          {label}
        </label>
        <ErrorText message={error} />
      </span>
    </div>
  );
}

function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      target="_blank"
      className="font-bold text-ats-blue underline decoration-ats-blue/40 underline-offset-4 transition hover:text-ats-blue-hover"
    >
      {children}
    </Link>
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <span className="mt-2 block text-xs font-semibold text-ats-blue">
      {translateMessage(message, message)}
    </span>
  );
}

function translateMessage(message: unknown, fallback: string) {
  if (typeof message !== "string" || message.length === 0) {
    return fallback;
  }

  return messageTranslations[message] ?? message;
}

async function readJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function fallbackMessageForStatus(status: number) {
  if (status === 401) {
    return "Etkinlik kaydı için giriş yapmanız gerekir.";
  }

  if (status === 403) {
    return "Etkinlik kaydı için üyelik profilinizi tamamlamanız gerekir.";
  }

  if (status === 409) {
    return "Kayıt zaten mevcut veya kontenjan dolu.";
  }

  if (status === 422) {
    return "Form eksik veya geçersiz.";
  }

  return "Kayıt şu anda tamamlanamadı. Lütfen tekrar deneyin.";
}

function valueOf(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}
