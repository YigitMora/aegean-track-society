import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/auth/actions";
import { RatingDiscoveryBanner } from "@/components/rating-discovery";
import { requireMemberUser } from "@/lib/member-auth";
import { isMemberProfileComplete } from "@/lib/member-profile-validation";
import { prisma } from "@/lib/prisma";
import { getRatingDiscoveryBannerData } from "@/lib/rating-discovery";
import { measureServerTiming } from "@/lib/server-timing";

type AccountPageProps = {
  searchParams: Promise<{
    profile?: string;
  }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const [memberUser, params] = await Promise.all([
    requireMemberUser("/account"),
    searchParams,
  ]);
  const profile = memberUser.profile;
  const profileComplete = isMemberProfileComplete(memberUser);

  if (!profileComplete) {
    redirect("/account/onboarding");
  }

  const [
    activeVehicleCount,
    primaryVehicle,
    activeRegistrationCount,
    ratingDiscoveryBanner,
  ] =
    await measureServerTiming("ACCOUNT_SUMMARY_QUERY", () =>
      Promise.all([
        prisma.vehicle.count({
          where: {
            userId: memberUser.id,
            deletedAt: null,
          },
        }),
        prisma.vehicle.findFirst({
          where: {
            userId: memberUser.id,
            deletedAt: null,
            isPrimary: true,
          },
          select: {
            brand: true,
            model: true,
            plateNumber: true,
          },
        }),
        prisma.registration.count({
          where: {
            userId: memberUser.id,
            deletedAt: null,
          },
        }),
        getRatingDiscoveryBannerData(memberUser.id),
      ]),
    );

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
            Bu alan Aegean Track Society üyelik altyapısının merkezidir.
            Garajınızı yönetebilir, profil bilgilerinizi güncelleyebilir ve
            sonraki fazlarda etkinlik kayıt geçmişinize ulaşabilirsiniz.
          </p>
        </div>

        <div className="space-y-5">
          {params.profile === "updated" ? (
            <p className="rounded-md border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100">
              Profil bilgileriniz güncellendi.
            </p>
          ) : null}

          <RatingDiscoveryBanner data={ratingDiscoveryBanner} />

          <section className="rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ats-muted">
              Üyelik kimliği
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
              <Info label="Görünen ad" value={profile?.displayName ?? "-"} />
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
              Garaj özeti
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Info label="Aktif araç" value={String(activeVehicleCount)} />
              <Info
                label="Birincil araç"
                value={
                  primaryVehicle
                    ? `${primaryVehicle.brand} ${primaryVehicle.model} · ${primaryVehicle.plateNumber}`
                    : "-"
                }
              />
            </div>
            <Link
              href="/account/garage"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-full border border-ats-border px-6 text-sm font-black text-ats-text transition hover:border-ats-blue hover:text-ats-blue"
            >
              Garajımı Aç
            </Link>
          </section>

          <section className="rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ats-blue">
              Başvurular
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Info label="Aktif kayıt" value={String(activeRegistrationCount)} />
              <Info label="Sonraki etkinlik" value="Kula MyTrack" />
            </div>
            <Link
              href="/account/registrations"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-full border border-ats-border px-6 text-sm font-black text-ats-text transition hover:border-ats-blue hover:text-ats-blue"
            >
              Başvurularımı Aç
            </Link>
          </section>

          <section className="rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ats-blue">
              Yaklaşan altyapı
            </p>
            <div className="mt-5 grid gap-3">
              {["QR biletler"].map((item) => (
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
