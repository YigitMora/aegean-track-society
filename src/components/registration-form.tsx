"use client";

import type { FormEvent } from "react";
import { useState } from "react";

type FieldErrors = Record<string, string[] | undefined>;

const experienceLevels = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
  { value: "PROFESSIONAL", label: "Professional" },
];

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
        setFormMessage(data.message ?? "Registration could not be completed.");
        return;
      }

      if (data.paymentMode === "manual") {
        setIsReservationReceived(true);
        setFormMessage(
          data.message ??
            "Registration received. Our team will contact you for payment and confirmation.",
        );
        return;
      }

      if (!data.paymentPageUrl) {
        setFormMessage("Secure payment could not be initialized. Please try again.");
        return;
      }

      shouldKeepSubmitting = true;
      setIsRedirecting(true);
      setFormMessage(data.message ?? "Redirecting to secure payment...");
      window.location.assign(data.paymentPageUrl);
    } catch {
      setFormMessage("Registration could not be completed. Please try again.");
    } finally {
      if (!shouldKeepSubmitting) {
        setIsSubmitting(false);
      }
    }
  }

  if (isRedirecting) {
    return (
      <section className="rounded-lg border border-black/10 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase text-kerb">Secure payment</p>
        <h2 className="mt-3 text-3xl font-black text-asphalt">
          Redirecting to secure payment...
        </h2>
        <p className="mt-4 text-sm leading-6 text-steel">
          Your registration has been received. You are being sent to iyzico to
          complete payment.
        </p>
      </section>
    );
  }

  if (isReservationReceived) {
    return (
      <section className="rounded-lg border border-black/10 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase text-kerb">Registration received</p>
        <h2 className="mt-3 text-3xl font-black text-asphalt">
          Your request is in.
        </h2>
        <p className="mt-4 text-sm leading-6 text-steel">
          {formMessage ??
            "Registration received. Our team will contact you for payment and confirmation."}
        </p>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-black/10 bg-white p-6 shadow-soft sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Full name"
          name="fullName"
          autoComplete="name"
          error={fieldErrors.fullName?.[0]}
        />
        <Field
          label="Phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+90 5xx xxx xx xx"
          error={fieldErrors.phone?.[0]}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          error={fieldErrors.email?.[0]}
        />
        <Field
          label="Car brand/model"
          name="carBrandModel"
          placeholder="Porsche 718 Cayman"
          error={fieldErrors.carBrandModel?.[0]}
        />
        <Field
          label="Plate number"
          name="plateNumber"
          placeholder="35 ABC 123"
          error={fieldErrors.plateNumber?.[0]}
        />
        <label className="block">
          <span className="text-sm font-bold text-asphalt">Driving experience</span>
          <select
            name="experienceLevel"
            required
            defaultValue=""
            className="mt-2 h-12 w-full rounded-md border border-black/15 bg-white px-3 text-sm font-semibold text-asphalt outline-none transition focus:border-kerb"
          >
            <option value="" disabled>
              Select level
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
          label="Emergency contact name"
          name="emergencyContactName"
          autoComplete="off"
          error={fieldErrors.emergencyContactName?.[0]}
        />
        <Field
          label="Emergency contact phone"
          name="emergencyContactPhone"
          type="tel"
          autoComplete="off"
          placeholder="+90 5xx xxx xx xx"
          error={fieldErrors.emergencyContactPhone?.[0]}
        />
      </div>

      <div className="mt-8 space-y-4 border-t border-black/10 pt-6">
        <Checkbox
          name="kvkkAccepted"
          label="I accept KVKK consent for registration and event operations."
          error={fieldErrors.kvkkAccepted?.[0]}
          required
        />
        <Checkbox
          name="liabilityWaiverAccepted"
          label="I accept the motorsport liability waiver."
          error={fieldErrors.liabilityWaiverAccepted?.[0]}
          required
        />
        <Checkbox
          name="marketingConsent"
          label="I agree to receive future Aegean Track Days updates."
          error={fieldErrors.marketingConsent?.[0]}
        />
      </div>

      {formMessage ? (
        <p className="mt-6 rounded-md border border-kerb/20 bg-kerb/5 px-4 py-3 text-sm font-semibold text-kerb">
          {formMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-kerb px-6 text-sm font-black text-white transition hover:bg-asphalt disabled:cursor-not-allowed disabled:bg-steel"
      >
        {isSubmitting ? "Submitting registration..." : "Submit registration request"}
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
      <span className="text-sm font-bold text-asphalt">{label}</span>
      <input
        name={name}
        type={type}
        required
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-2 h-12 w-full rounded-md border border-black/15 bg-white px-3 text-sm font-semibold text-asphalt outline-none transition placeholder:text-steel/60 focus:border-kerb"
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
        className="mt-1 h-4 w-4 rounded border-black/20 text-kerb"
      />
      <span>
        <span className="block text-sm font-semibold leading-6 text-asphalt">{label}</span>
        <ErrorText message={error} />
      </span>
    </label>
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <span className="mt-2 block text-xs font-semibold text-kerb">{message}</span>;
}

function valueOf(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}
