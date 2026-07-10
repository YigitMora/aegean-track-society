import Link from "next/link";
import {
  AuthField,
  AuthMessage,
  AuthShell,
  AuthSubmitButton,
} from "@/components/auth/auth-shell";
import { forgotPasswordAction } from "../actions";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
    sent?: string;
  }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams;

  return (
    <AuthShell
      eyebrow="Şifre yenileme"
      title="Şifrenizi yenileyin."
      subtitle="E-posta adresinizi girin. Sistemimizde kayıtlıysa şifre yenileme bağlantısı gönderilecektir."
      footer={
        <Link href="/auth/login" className="text-ats-blue transition hover:text-ats-blue-hover">
          Giriş sayfasına dön
        </Link>
      }
    >
      {params.error === "config" ? (
        <AuthMessage tone="error">
          Üyelik sistemi şu anda yapılandırılmamış. Lütfen ekiple iletişime geçin.
        </AuthMessage>
      ) : null}
      {params.sent ? (
        <AuthMessage tone="success">
          Bu e-posta sistemimizde kayıtlıysa şifre yenileme bağlantısı gönderildi.
        </AuthMessage>
      ) : null}

      <form action={forgotPasswordAction} className="space-y-5">
        <AuthField label="E-posta" name="email" type="email" autoComplete="email" />
        <AuthSubmitButton>Yenileme bağlantısı gönder</AuthSubmitButton>
      </form>
    </AuthShell>
  );
}
