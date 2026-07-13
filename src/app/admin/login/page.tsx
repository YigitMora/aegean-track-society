import { redirect } from "next/navigation";
import { normalizeAdminReturnTo } from "@/lib/admin-auth";
import { adminDefaultPathForRole, getCurrentAdminActor } from "@/lib/admin-authorization";

type AdminLoginPageProps = {
  searchParams: Promise<{
    error?: string;
    teamError?: string;
    returnTo?: string;
  }>;
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const { error, teamError, returnTo: requestedReturnTo } = await searchParams;
  const returnTo = normalizeAdminReturnTo(requestedReturnTo);
  const adminActor = await getCurrentAdminActor();

  if (adminActor) {
    redirect(adminDefaultPathForRole(adminActor.role));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-asphalt px-6 py-12 text-white">
      <section className="w-full max-w-3xl rounded-lg border border-white/15 bg-white/10 p-6 shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase text-signal">Aegean Track Days</p>
        <h1 className="mt-3 text-4xl font-black">Yönetim girişi</h1>
        <p className="mt-4 text-sm leading-6 text-white/70">
          Sistem sahibi ayrı yönetici şifresiyle, ekip üyeleri mevcut ATS hesaplarıyla giriş yapar.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <article className="rounded-md border border-white/10 bg-asphalt p-5">
            <p className="text-sm font-black uppercase text-signal">Sistem Sahibi Girişi</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/60">
              ADMIN_EMAIL ve ADMIN_PASSWORD ile korunan bağımsız sahip oturumu.
            </p>

            <form action="/admin/login/submit" method="post" className="mt-5 space-y-5">
              <input type="hidden" name="returnTo" value={returnTo} />
              <label className="block">
                <span className="text-sm font-bold">E-posta</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-2 h-12 w-full rounded-md border border-white/20 bg-white px-3 text-sm font-semibold text-asphalt outline-none transition focus:border-signal"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold">Şifre</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="mt-2 h-12 w-full rounded-md border border-white/20 bg-white px-3 text-sm font-semibold text-asphalt outline-none transition focus:border-signal"
                />
              </label>

              {error ? (
                <AdminLoginMessage>
                  Sistem sahibi bilgileri doğrulanamadı.
                </AdminLoginMessage>
              ) : null}

              <button
                type="submit"
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-kerb px-6 text-sm font-black text-white transition hover:bg-white hover:text-asphalt"
              >
                Sistem Sahibi Girişi
              </button>
            </form>
          </article>

          <article className="rounded-md border border-white/10 bg-asphalt p-5">
            <p className="text-sm font-black uppercase text-signal">ATS Hesabıyla Giriş Yap</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/60">
              Yardımcı admin ve check-in operatörleri mevcut ATS üyelik hesaplarıyla giriş yapar.
            </p>

            {teamError ? (
              <div className="mt-5">
                <AdminLoginMessage>{teamLoginMessage(teamError)}</AdminLoginMessage>
              </div>
            ) : null}

            <a
              href={`/admin/member-login?returnTo=${encodeURIComponent(returnTo)}`}
              className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-full bg-white px-6 text-sm font-black text-asphalt transition hover:bg-signal"
            >
              ATS Hesabıyla Giriş Yap
            </a>
          </article>
        </div>
      </section>
    </main>
  );
}

function AdminLoginMessage({ children }: { children: string }) {
  return (
    <p className="rounded-md border border-kerb/30 bg-kerb/10 px-4 py-3 text-sm font-semibold text-white">
      {children}
    </p>
  );
}

function teamLoginMessage(error: string) {
  if (error === "owner_login_required") {
    return "Sistem sahibi hesabı ayrı yönetici girişini kullanmalıdır.";
  }

  if (error === "invalid_role" || error === "failed") {
    return "Yönetim erişiminiz kaldırılmış veya geçersiz.";
  }

  return "Bu hesap için yönetim yetkisi bulunmuyor.";
}
