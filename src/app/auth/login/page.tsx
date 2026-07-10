import Link from "next/link";
import {
  AuthField,
  AuthMessage,
  AuthShell,
  AuthSubmitButton,
} from "@/components/auth/auth-shell";
import { normalizeMemberReturnTo } from "@/lib/member-auth";
import { loginAction } from "../actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    reset?: string;
    returnTo?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const returnTo = normalizeMemberReturnTo(params.returnTo);

  return (
    <AuthShell
      eyebrow="Giriş"
      title="Hesabınıza giriş yapın."
      subtitle="Aegean Track Society üyelik alanı; profil, garaj ve etkinlik geçmişi için temel hesap katmanıdır."
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/auth/forgot-password" className="text-ats-blue transition hover:text-ats-blue-hover">
            Şifremi unuttum
          </Link>
          <Link href={`/auth/sign-up?returnTo=${encodeURIComponent(returnTo)}`} className="text-ats-blue transition hover:text-ats-blue-hover">
            Üye ol
          </Link>
        </div>
      }
    >
      {params.reset === "success" ? (
        <AuthMessage tone="success">
          Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.
        </AuthMessage>
      ) : null}
      {params.error ? (
        <AuthMessage tone="error">{messageForLoginError(params.error)}</AuthMessage>
      ) : null}

      <form action={loginAction} className="space-y-5">
        <input type="hidden" name="returnTo" value={returnTo} />
        <AuthField label="E-posta" name="email" type="email" autoComplete="email" />
        <AuthField label="Şifre" name="password" type="password" autoComplete="current-password" />
        <AuthSubmitButton>Giriş Yap</AuthSubmitButton>
      </form>
    </AuthShell>
  );
}

function messageForLoginError(error: string) {
  if (error === "config") {
    return "Üyelik sistemi şu anda yapılandırılmamış. Lütfen ekiple iletişime geçin.";
  }

  if (error === "account_unavailable") {
    return "Bu hesap şu anda erişime açık değil.";
  }

  if (error === "provisioning_failed") {
    return "Hesap kaydı hazırlanamadı. Lütfen daha sonra tekrar deneyin.";
  }

  if (error === "confirm_failed" || error === "callback_failed") {
    return "Bağlantı doğrulanamadı. Lütfen tekrar giriş yapın.";
  }

  return "E-posta veya şifre bilgileri doğrulanamadı.";
}
