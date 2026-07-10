import { normalizeTurkishPhone } from "@/lib/registration-validation";

const requiredTextMinLength = 2;
const maxTextLength = 120;
const normalizedTurkishMobileRegex = /^\+90 5\d{2} \d{3} \d{2} \d{2}$/;

export type MemberProfileInput = {
  fullName: string;
  phone: string;
  displayName: string | null;
  memberMarketingConsent: boolean;
};

export type MemberSignupInput = {
  fullName: string;
  phone: string;
  memberKvkkAccepted: boolean;
  memberTermsAccepted: boolean;
  memberMarketingConsent: boolean;
};

export type MemberProfileValidationResult =
  | {
      ok: true;
      data: MemberProfileInput;
      acceptedMissingConsents: boolean;
    }
  | {
      ok: false;
    };

export function parseMemberSignupIdentity(formData: FormData): MemberSignupInput | null {
  const fullName = normalizeRequiredText(formData.get("fullName"));
  const phone = normalizeRequiredTurkishPhone(formData.get("phone"));
  const memberKvkkAccepted = formData.get("memberKvkkAccepted") === "on";
  const memberTermsAccepted = formData.get("memberTermsAccepted") === "on";
  const memberMarketingConsent = formData.get("memberMarketingConsent") === "on";

  if (!fullName || !phone || !memberKvkkAccepted || !memberTermsAccepted) {
    return null;
  }

  return {
    fullName,
    phone,
    memberKvkkAccepted,
    memberTermsAccepted,
    memberMarketingConsent,
  };
}

export function parseMemberProfileForm(
  formData: FormData,
  options: {
    requireMissingConsents: boolean;
  },
): MemberProfileValidationResult {
  const fullName = normalizeRequiredText(formData.get("fullName"));
  const phone = normalizeRequiredTurkishPhone(formData.get("phone"));
  const displayName = normalizeOptionalText(formData.get("displayName"));
  const memberMarketingConsent = formData.get("memberMarketingConsent") === "on";
  const acceptedMissingConsents =
    formData.get("memberKvkkAccepted") === "on" &&
    formData.get("memberTermsAccepted") === "on";

  if (!fullName || !phone) {
    return {
      ok: false,
    };
  }

  if (options.requireMissingConsents && !acceptedMissingConsents) {
    return {
      ok: false,
    };
  }

  return {
    ok: true,
    acceptedMissingConsents,
    data: {
      fullName,
      phone,
      displayName,
      memberMarketingConsent,
    },
  };
}

export function isMemberProfileComplete(member: {
  memberKvkkAcceptedAt: Date | null;
  memberTermsAcceptedAt: Date | null;
  profile:
    | {
        fullName: string | null;
        phone: string | null;
      }
    | null;
}) {
  return Boolean(
    member.profile?.fullName &&
      member.profile.phone &&
      member.memberKvkkAcceptedAt &&
      member.memberTermsAcceptedAt,
  );
}

function normalizeRequiredText(value: FormDataEntryValue | null) {
  const normalized = normalizeOptionalText(value);

  if (!normalized || normalized.length < requiredTextMinLength) {
    return null;
  }

  return normalized;
}

function normalizeOptionalText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxTextLength);
}

function normalizeRequiredTurkishPhone(value: FormDataEntryValue | null) {
  const phone = normalizeOptionalTurkishPhone(value);

  return phone ?? null;
}

function normalizeOptionalTurkishPhone(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const normalized = normalizeTurkishPhone(value);

  if (!normalizedTurkishMobileRegex.test(normalized)) {
    return null;
  }

  return normalized;
}
