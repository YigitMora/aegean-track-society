import { MemberProfileForm } from "@/components/member-profile-form";
import { requireMemberUser } from "@/lib/member-auth";

type AccountProfilePageProps = {
  searchParams: Promise<{
    profileError?: string;
    profile?: string;
  }>;
};

export default async function AccountProfilePage({ searchParams }: AccountProfilePageProps) {
  const [memberUser, params] = await Promise.all([
    requireMemberUser("/account/profile"),
    searchParams,
  ]);
  const requireMissingConsents =
    !memberUser.memberKvkkAcceptedAt || !memberUser.memberTermsAcceptedAt;

  return (
    <section className="mx-auto max-w-5xl px-6 py-16 sm:px-8 lg:px-10 lg:py-24">
      <div className="mb-10 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-ats-blue">
          Profil
        </p>
        <h1 className="mt-5 text-5xl font-black leading-none text-ats-text sm:text-7xl">
          Üye bilgilerinizi düzenleyin.
        </h1>
        <p className="mt-6 text-base leading-7 text-ats-muted sm:text-lg sm:leading-8">
          Bu profil üyelik alanı içindir. Kula MyTrack etkinlik kayıtları
          mevcut anonim kayıt akışıyla çalışmaya devam eder.
        </p>
      </div>

      {params.profile === "updated" ? (
        <p className="mb-5 rounded-md border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100">
          Profil bilgileriniz güncellendi.
        </p>
      ) : null}
      {params.profileError ? (
        <p className="mb-5 rounded-md border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
          Lütfen ad soyad ve Türkiye mobil telefon numarası alanlarını kontrol edin.
        </p>
      ) : null}

      <MemberProfileForm
        profile={memberUser.profile}
        marketingConsentActive={Boolean(
          memberUser.memberMarketingConsentAt &&
            !memberUser.memberMarketingConsentRevokedAt,
        )}
        requireMissingConsents={requireMissingConsents}
        returnTo="/account/profile"
        submitLabel="Profili Kaydet"
      />
    </section>
  );
}
