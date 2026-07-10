import Link from "next/link";
import {
  AuthField,
  AuthMessage,
  AuthShell,
  AuthSubmitButton,
} from "@/components/auth/auth-shell";
import { resetPasswordAction } from "../actions";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;

  return (
    <AuthShell
      eyebrow="Yeni şifre"
      title="Yeni şifrenizi belirleyin."
      subtitle="Şifre yenileme bağlantınız geçerliyse yeni şifreyi kaydedebilir ve hesabınıza tekrar giriş yapabilirsiniz."
      footer={
        <Link href="/auth/login" className="text-ats-blue transition hover:text-ats-blue-hover">
          Giriş sayfasına dön
        </Link>
      }
    >
      {params.error ? (
        <AuthMessage tone="error">{messageForResetError(params.error)}</AuthMessage>
      ) : null}

      <form action={resetPasswordAction} className="space-y-5">
        <AuthField label="Yeni şifre" name="password" type="password" autoComplete="new-password" />
        <AuthField
          label="Yeni şifre tekrar"
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
        />
        <p className="text-xs font-semibold leading-5 text-ats-muted">
          Şifreniz en az 8 karakter olmalıdır.
        </p>
        <AuthSubmitButton>Şifreyi Güncelle</AuthSubmitButton>
      </form>
    </AuthShell>
  );
}

function messageForResetError(error: string) {
  if (error === "config") {
    return "Üyelik sistemi şu anda yapılandırılmamış. Lütfen ekiple iletişime geçin.";
  }

  if (error === "invalid") {
    return "Şifre en az 8 karakter olmalı ve tekrar alanıyla aynı olmalıdır.";
  }

  return "Şifre güncellenemedi. Bağlantı süresi dolmuş olabilir.";
}
