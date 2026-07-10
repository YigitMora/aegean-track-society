import Link from "next/link";
import {
  AuthField,
  AuthMessage,
  AuthShell,
  AuthSubmitButton,
} from "@/components/auth/auth-shell";
import { TurkishPhoneInput } from "@/components/turkish-phone-input";
import { normalizeMemberReturnTo } from "@/lib/member-auth";
import { signUpAction } from "../actions";

type SignUpPageProps = {
  searchParams: Promise<{
    error?: string;
    returnTo?: string;
  }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const returnTo = normalizeMemberReturnTo(params.returnTo);

  return (
    <AuthShell
      eyebrow="Üyelik"
      title="Aegean Track Society üyeliği."
      subtitle="Pist deneyimlerini, gelecek etkinlikleri ve kişisel garaj altyapısını tek bir hesap altında toplamak için ilk adımı atın."
      footer={
        <>
          Zaten hesabınız var mı?{" "}
          <Link href={`/auth/login?returnTo=${encodeURIComponent(returnTo)}`} className="text-ats-blue transition hover:text-ats-blue-hover">
            Giriş yapın
          </Link>
          .
        </>
      }
    >
      {params.error ? (
        <AuthMessage tone="error">{messageForSignUpError(params.error)}</AuthMessage>
      ) : null}

      <form action={signUpAction} className="space-y-5">
        <input type="hidden" name="returnTo" value={returnTo} />
        <AuthField label="Ad soyad" name="fullName" autoComplete="name" />
        <TurkishPhoneInput label="Telefon" name="phone" required />
        <AuthField label="E-posta" name="email" type="email" autoComplete="email" />
        <AuthField label="Şifre" name="password" type="password" autoComplete="new-password" />
        <AuthField
          label="Şifre tekrar"
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
        />
        <p className="text-xs font-semibold leading-5 text-ats-muted">
          Şifreniz en az 8 karakter olmalıdır. Şifre yönetimi Supabase Auth
          tarafından yapılır; ATS veritabanında şifre tutulmaz.
        </p>
        <div className="space-y-3 border-t border-ats-border pt-5">
          <SignupConsent
            name="memberKvkkAccepted"
            label="Aegean Track Society üyelik hesabı için KVKK aydınlatmasını okudum ve kişisel verilerimin hesap oluşturma amacıyla işlenmesini kabul ediyorum."
            required
          />
          <SignupConsent
            name="memberTermsAccepted"
            label="Aegean Track Society üyelik kullanım şartlarını kabul ediyorum."
            required
          />
          <SignupConsent
            name="memberMarketingConsent"
            label="Aegean Track Society duyurularını almayı kabul ediyorum."
          />
        </div>
        <AuthSubmitButton>Üye Ol</AuthSubmitButton>
      </form>
    </AuthShell>
  );
}

function messageForSignUpError(error: string) {
  if (error === "config") {
    return "Üyelik sistemi şu anda yapılandırılmamış. Lütfen ekiple iletişime geçin.";
  }

  if (error === "invalid") {
    return "Ad soyad, telefon, e-posta, şifre ve üyelik onaylarını kontrol edin.";
  }

  return "Üyelik işlemi şu anda tamamlanamadı. Bilgilerinizi kontrol edip kısa süre sonra tekrar deneyin.";
}

function SignupConsent({
  name,
  label,
  required = false,
}: {
  name: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="flex gap-3 text-sm font-semibold leading-6 text-ats-text">
      <input
        name={name}
        type="checkbox"
        required={required}
        className="mt-1 h-4 w-4 rounded border-ats-border bg-ats-black accent-ats-blue"
      />
      <span>{label}</span>
    </label>
  );
}
