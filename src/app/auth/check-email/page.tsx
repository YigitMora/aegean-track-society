import Link from "next/link";
import { AuthMessage, AuthShell } from "@/components/auth/auth-shell";
import { normalizeMemberReturnTo } from "@/lib/member-auth";

type CheckEmailPageProps = {
  searchParams: Promise<{
    returnTo?: string;
  }>;
};

export default async function CheckEmailPage({ searchParams }: CheckEmailPageProps) {
  const params = await searchParams;
  const returnTo = normalizeMemberReturnTo(params.returnTo);

  return (
    <AuthShell
      eyebrow="E-posta doğrulama"
      title="E-postanızı kontrol edin."
      subtitle="Üyelik talebiniz alındı. Hesabınızı aktif etmek için e-posta kutunuzdaki doğrulama bağlantısını kullanın."
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/auth/login" className="text-ats-blue transition hover:text-ats-blue-hover">
            Giriş Yap
          </Link>
          <Link
            href="/auth/forgot-password"
            className="text-ats-blue transition hover:text-ats-blue-hover"
          >
            Şifremi Unuttum
          </Link>
          <Link href={returnTo} className="text-ats-blue transition hover:text-ats-blue-hover">
            Devam Et
          </Link>
        </div>
      }
    >
      <AuthMessage tone="info">
        Bağlantı birkaç dakika içinde ulaşmazsa spam klasörünü kontrol edin.
      </AuthMessage>
      <p className="text-sm font-semibold leading-6 text-ats-muted">
        Hesabınız doğrulandıktan sonra Aegean Track Society üyelik alanına
        erişebilirsiniz. Garaj, etkinlik geçmişi ve biletler sonraki fazlarda
        eklenecektir.
      </p>
      <p className="mt-4 text-sm font-semibold leading-6 text-ats-muted">
        Bu e-posta ile daha önce üyelik oluşturduysanız yeni bir hesap açılmaz.
        Giriş yapabilir veya şifrenizi hatırlamıyorsanız şifre yenileme
        bağlantısı isteyebilirsiniz.
      </p>
    </AuthShell>
  );
}
