import { updateMemberProfileAction } from "@/app/account/profile/actions";

type MemberProfileFormProps = {
  profile:
    | {
        fullName: string | null;
        phone: string | null;
        displayName: string | null;
      }
    | null;
  marketingConsentActive: boolean;
  requireMissingConsents: boolean;
  returnTo: string;
  submitLabel: string;
};

export function MemberProfileForm({
  profile,
  marketingConsentActive,
  requireMissingConsents,
  returnTo,
  submitLabel,
}: MemberProfileFormProps) {
  return (
    <form
      action={updateMemberProfileAction}
      className="rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft sm:p-8"
    >
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="grid gap-5 sm:grid-cols-2">
        <ProfileField
          label="Ad soyad"
          name="fullName"
          defaultValue={profile?.fullName ?? ""}
          autoComplete="name"
          required
        />
        <ProfileField
          label="Telefon"
          name="phone"
          type="tel"
          defaultValue={profile?.phone ?? ""}
          autoComplete="tel"
          placeholder="+90 5xx xxx xx xx"
          required
        />
        <ProfileField
          label="Görünen ad"
          name="displayName"
          defaultValue={profile?.displayName ?? ""}
          placeholder="Pistte görünmesini istediğiniz ad"
        />
      </div>

      {requireMissingConsents ? (
        <div className="mt-8 space-y-3 border-t border-ats-border pt-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ats-blue">
            Üyelik onayları
          </p>
          <ProfileConsent
            name="memberKvkkAccepted"
            label="Aegean Track Society üyelik hesabı için KVKK aydınlatmasını okudum ve kişisel verilerimin hesap yönetimi amacıyla işlenmesini kabul ediyorum."
          />
          <ProfileConsent
            name="memberTermsAccepted"
            label="Aegean Track Society üyelik kullanım şartlarını kabul ediyorum."
          />
        </div>
      ) : null}

      <div className="mt-8 border-t border-ats-border pt-5">
        <label className="flex gap-3 text-sm font-semibold leading-6 text-ats-text">
          <input
            name="memberMarketingConsent"
            type="checkbox"
            defaultChecked={marketingConsentActive}
            className="mt-1 h-4 w-4 rounded border-ats-border bg-ats-black accent-ats-blue"
          />
          <span>
            Aegean Track Society üyelik ve etkinlik duyurularını almak istiyorum.
          </span>
        </label>
        <p className="mt-2 text-xs font-semibold leading-5 text-ats-muted">
          Bu tercihi istediğiniz zaman değiştirabilirsiniz.
        </p>
      </div>

      <button
        type="submit"
        className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-ats-blue px-6 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover focus:outline-none focus:ring-2 focus:ring-ats-blue/40"
      >
        {submitLabel}
      </button>
    </form>
  );
}

function ProfileField({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  autoComplete,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue: string;
  placeholder?: string;
  autoComplete?: string;
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
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-2 h-12 w-full rounded-md border border-ats-border bg-ats-black px-3 text-sm font-semibold text-ats-text outline-none transition placeholder:text-ats-muted/60 focus:border-ats-blue focus:ring-2 focus:ring-ats-blue/20"
      />
    </label>
  );
}

function ProfileConsent({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex gap-3 text-sm font-semibold leading-6 text-ats-text">
      <input
        name={name}
        type="checkbox"
        required
        className="mt-1 h-4 w-4 rounded border-ats-border bg-ats-black accent-ats-blue"
      />
      <span>{label}</span>
    </label>
  );
}
