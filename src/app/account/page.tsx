import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/auth/actions";
import { requireMemberUser } from "@/lib/member-auth";
import { isMemberProfileComplete } from "@/lib/member-profile-validation";

type AccountPageProps = {
  searchParams: Promise<{
    profile?: string;
  }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const memberUser = await requireMemberUser("/account");
  const params = await searchParams;
  const profile = memberUser.profile;
  const profileComplete = isMemberProfileComplete(memberUser);

  if (!profileComplete) {
    redirect("/account/onboarding");
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-10 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-ats-blue">
            Üye alanı
          </p>
          <h1 className="mt-5 text-5xl font-black leading-none text-ats-text sm:text-7xl">
            Hesabınız hazır.
          </h1>
          <p className="mt-6 text-base leading-7 text-ats-muted sm:text-lg sm:leading-8">
            Bu alan Aegean Track Society üyelik altyapısının ilk fazıdır.
            Dijital garaj, etkinlik kayıt geçmişi ve QR biletler sonraki
            sprintlerde eklenecektir.
          </p>
        </div>

        <div className="space-y-5">
          {params.profile === "updated" ? (
            <p className="rounded-md border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100">
              Profil bilgileriniz güncellendi.
            </p>
          ) : null}

          <section className="rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ats-muted">
              ATS member identity
            </p>
            <h2 className="mt-4 break-words text-3xl font-black text-ats-text">
              {profile?.displayName || profile?.fullName || memberUser.email}
            </h2>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <Info label="E-posta" value={memberUser.email} />
              <Info label="Üyelik durumu" value={memberUser.status} />
              <Info label="Rol" value={memberUser.role} />
              <Info
                label="Profil"
                value={profileComplete ? "Tamamlandı" : "Henüz tamamlanmadı"}
              />
              <Info label="Telefon" value={profile?.phone ?? "-"} />
              <Info
                label="Sürüş deneyimi"
                value={formatExperienceLevel(profile?.experienceLevel)}
              />
              <Info
                label="Acil durum kişisi"
                value={profile?.emergencyContactName ?? "-"}
              />
              <Info
                label="Acil durum telefonu"
                value={profile?.emergencyContactPhone ?? "-"}
              />
            </dl>
            <Link
              href="/account/profile"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-ats-blue px-6 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover"
            >
              Profili Düzenle
            </Link>
          </section>

          <section className="rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ats-blue">
              Yaklaşan altyapı
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {["Dijital garaj", "Kayıt geçmişi", "QR biletler"].map((item) => (
                <div key={item} className="rounded-md border border-ats-border bg-ats-black p-4">
                  <p className="text-sm font-black text-ats-text">{item}</p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-ats-muted">
                    Sonraki fazlarda açılacak.
                  </p>
                </div>
              ))}
            </div>
          </section>

          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-full border border-ats-border px-6 text-sm font-black text-ats-text transition hover:border-ats-blue hover:text-ats-blue focus:outline-none focus:ring-2 focus:ring-ats-blue/30"
            >
              Çıkış Yap
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function formatExperienceLevel(value: string | null | undefined) {
  if (value === "BEGINNER") {
    return "İlk pist tecrübem olacak";
  }

  if (value === "INTERMEDIATE") {
    return "Daha önce pist deneyimim var";
  }

  if (value === "ADVANCED") {
    return "İleri seviye pist deneyimim var";
  }

  if (value === "PROFESSIONAL") {
    return "Profesyonel / lisanslı sürücü";
  }

  return "-";
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-ats-border pb-3">
      <dt className="text-xs font-bold uppercase tracking-[0.14em] text-ats-muted">
        {label}
      </dt>
      <dd className="mt-2 break-words text-sm font-black text-ats-text">{value}</dd>
    </div>
  );
}
