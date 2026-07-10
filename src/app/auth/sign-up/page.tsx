import Link from "next/link";
import {
  AuthField,
  AuthMessage,
  AuthShell,
  AuthSubmitButton,
} from "@/components/auth/auth-shell";
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
    return "E-posta ve şifre bilgilerini kontrol edin.";
  }

  return "Üyelik başlatılamadı. Lütfen daha sonra tekrar deneyin.";
}
