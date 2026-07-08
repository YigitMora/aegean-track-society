"use client";

import type { FormEvent } from "react";
import { useState } from "react";

type FieldErrors = Record<string, string[] | undefined>;

const experienceLevels = [
  { value: "BEGINNER", label: "Başlangıç" },
  { value: "INTERMEDIATE", label: "Orta seviye" },
  { value: "ADVANCED", label: "İleri seviye" },
  { value: "PROFESSIONAL", label: "Profesyonel" },
];

const messageTranslations: Record<string, string> = {
  "Registration could not be completed.": "Kayıt tamamlanamadı.",
  "Registration could not be completed. Please try again.":
    "Kayıt tamamlanamadı. Lütfen tekrar deneyin.",
  "Registration received. Our team will contact you for payment and confirmation.":
    "Kayıt talebiniz alındı. Ekibimiz ödeme ve kesin onay için sizinle iletişime geçecek.",
  "Secure payment could not be initialized. Please try again.":
    "Güvenli ödeme başlatılamadı. Lütfen tekrar deneyin.",
  "Redirecting to secure payment...": "Güvenli ödeme sayfasına yönlendiriliyorsunuz...",
  "Please check the registration form.": "Lütfen kayıt formundaki bilgileri kontrol edin.",
  "Invalid request body.": "Form isteği geçerli değil.",
  "Too many registration attempts. Please try again shortly.":
    "Çok fazla kayıt denemesi yapıldı. Lütfen kısa süre sonra tekrar deneyin.",
  "Too many attempts for this email and plate. Please try again later.":
    "Bu e-posta ve plaka için çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.",
  "A registration for this email and plate already exists for Kula MyTrack.":
    "Bu e-posta ve plaka için Kula MyTrack kaydı zaten mevcut.",
  "This event package is currently full.": "Bu etkinlik paketi için kontenjan dolu.",
  "Registration is not open for this event yet.": "Bu etkinlik için kayıt henüz açık değil.",
  "Payment amount is not configured for this event yet.":
    "Bu etkinlik için ödeme tutarı henüz tanımlanmadı.",
  "Full name is required.": "Ad soyad zorunludur.",
  "Full name must be at least 2 characters.": "Ad soyad en az 2 karakter olmalıdır.",
  "Phone is required.": "Telefon zorunludur.",
  "Enter a valid Turkish phone number.": "Geçerli bir Türkiye telefon numarası girin.",
  "Email is required.": "E-posta zorunludur.",
  "Enter a valid email address.": "Geçerli bir e-posta adresi girin.",
  "Car brand/model is required.": "Araç marka/model zorunludur.",
  "Plate number is required.": "Plaka zorunludur.",
  "Driving experience level is required.": "Sürüş deneyimi seviyesi zorunludur.",
  "Emergency contact name is required.": "Acil durum kişi adı zorunludur.",
  "Emergency contact phone is required.": "Acil durum telefonu zorunludur.",
  "Enter a valid Turkish emergency contact phone number.":
    "Geçerli bir acil durum telefonu girin.",
  "KVKK consent is required.": "KVKK onayı zorunludur.",
  "Liability waiver acceptance is required.": "Sorumluluk beyanı onayı zorunludur.",
};

export function RegistrationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isReservationReceived, setIsReservationReceived] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});
    setFormMessage(null);
    let shouldKeepSubmitting = false;

    const formData = new FormData(event.currentTarget);
    const payload = {
      fullName: valueOf(formData, "fullName"),
      phone: valueOf(formData, "phone"),
      email: valueOf(formData, "email"),
      carBrandModel: valueOf(formData, "carBrandModel"),
      plateNumber: valueOf(formData, "plateNumber"),
      experienceLevel: valueOf(formData, "experienceLevel"),
      emergencyContactName: valueOf(formData, "emergencyContactName"),
      emergencyContactPhone: valueOf(formData, "emergencyContactPhone"),
      kvkkAccepted: formData.get("kvkkAccepted") === "on",
      liabilityWaiverAccepted: formData.get("liabilityWaiverAccepted") === "on",
      marketingConsent: formData.get("marketingConsent") === "on",
    };

    try {
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setFieldErrors(data.fieldErrors ?? {});
        setFormMessage(
          translateMessage(data.message, "Kayıt tamamlanamadı. Lütfen bilgileri kontrol edin."),
        );
        return;
      }

      if (data.paymentMode === "manual") {
        setIsReservationReceived(true);
        setFormMessage(
          translateMessage(
            data.message,
            "Kayıt talebiniz alındı. Ekibimiz ödeme ve kesin onay için sizinle iletişime geçecek.",
          ),
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
      setFormMessage("Kayıt tamamlanamadı. Lütfen tekrar deneyin.");
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

  if (isReservationReceived) {
    return (
      <section className="rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-ats-blue">
          Kayıt alındı
        </p>
        <h2 className="mt-3 text-3xl font-black text-ats-text">
          Talebiniz ekibimize ulaştı.
        </h2>
        <p className="mt-4 text-sm leading-6 text-ats-muted">
          {formMessage ??
            "Kayıt talebiniz alındı. Ekibimiz ödeme ve kesin onay için sizinle iletişime geçecek."}
        </p>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Ad soyad"
          name="fullName"
          autoComplete="name"
          error={fieldErrors.fullName?.[0]}
        />
        <Field
          label="Telefon"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+90 5xx xxx xx xx"
          error={fieldErrors.phone?.[0]}
        />
        <Field
          label="E-posta"
          name="email"
          type="email"
          autoComplete="email"
          error={fieldErrors.email?.[0]}
        />
        <Field
          label="Araç marka/model"
          name="carBrandModel"
          placeholder="Hyundai i20 N"
          error={fieldErrors.carBrandModel?.[0]}
        />
        <Field
          label="Plaka"
          name="plateNumber"
          placeholder="35 ABC 123"
          error={fieldErrors.plateNumber?.[0]}
        />
        <label className="block">
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
        <Field
          label="Acil durum telefonu"
          name="emergencyContactPhone"
          type="tel"
          autoComplete="off"
          placeholder="+90 5xx xxx xx xx"
          error={fieldErrors.emergencyContactPhone?.[0]}
        />
      </div>

      <div className="mt-8 space-y-4 border-t border-ats-border pt-6">
        <Checkbox
          name="kvkkAccepted"
          label="Kayıt ve etkinlik operasyonları için KVKK aydınlatma ve onay metnini kabul ediyorum."
          error={fieldErrors.kvkkAccepted?.[0]}
          required
        />
        <Checkbox
          name="liabilityWaiverAccepted"
          label="Motorsport katılım ve sorumluluk beyanını kabul ediyorum."
          error={fieldErrors.liabilityWaiverAccepted?.[0]}
          required
        />
        <Checkbox
          name="marketingConsent"
          label="Aegean Track Society duyurularını almayı kabul ediyorum."
          error={fieldErrors.marketingConsent?.[0]}
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
        {isSubmitting ? "Kayıt gönderiliyor..." : "Kayıt talebi gönder"}
      </button>
    </form>
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
  label: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="flex gap-3">
      <input
        name={name}
        type="checkbox"
        required={required}
        className="mt-1 h-4 w-4 rounded border-ats-border bg-ats-black accent-ats-blue"
      />
      <span>
        <span className="block text-sm font-semibold leading-6 text-ats-text">{label}</span>
        <ErrorText message={error} />
      </span>
    </label>
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

function valueOf(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}
