import { MemberProfileForm } from "@/components/member-profile-form";
import { requireMemberUser } from "@/lib/member-auth";

type AccountOnboardingPageProps = {
  searchParams: Promise<{
    profileError?: string;
  }>;
};

export default async function AccountOnboardingPage({
  searchParams,
}: AccountOnboardingPageProps) {
  const memberUser = await requireMemberUser("/account/onboarding");
  const params = await searchParams;
  const requireMissingConsents =
    !memberUser.memberKvkkAcceptedAt || !memberUser.memberTermsAcceptedAt;

  return (
    <section className="mx-auto max-w-5xl px-6 py-16 sm:px-8 lg:px-10 lg:py-24">
      <div className="mb-10 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-ats-blue">
          Profil kurulumu
        </p>
        <h1 className="mt-5 text-5xl font-black leading-none text-ats-text sm:text-7xl">
          Üyelik profilinizi tamamlayın.
        </h1>
        <p className="mt-6 text-base leading-7 text-ats-muted sm:text-lg sm:leading-8">
          Hesabınızı aktif kullanabilmek için temel iletişim bilgilerinizi
          tamamlamanız gerekir. Bu bilgiler etkinlik kaydı yerine geçmez.
        </p>
      </div>

      {params.profileError ? (
        <p className="mb-5 rounded-md border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
          Lütfen ad soyad, Türkiye mobil telefon numarası ve gerekli üyelik
          onaylarını kontrol edin.
        </p>
      ) : null}

      <MemberProfileForm
        profile={memberUser.profile}
        requireMissingConsents={requireMissingConsents}
        returnTo="/account/onboarding"
        submitLabel="Profili Tamamla"
      />
    </section>
  );
}
