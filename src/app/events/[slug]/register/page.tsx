import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FooterCredit } from "@/components/footer-credit";
import { PublicNav } from "@/components/public-nav";
import { RegistrationForm } from "@/components/registration-form";
import { ensureMemberUser, getVerifiedSupabaseUser } from "@/lib/member-auth";
import { isMemberProfileComplete } from "@/lib/member-profile-validation";
import { prisma } from "@/lib/prisma";
import { measureServerTiming } from "@/lib/server-timing";

type RegisterPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { slug } = await params;
  const returnTo = `/events/${slug}/register`;
  const eventPromise = measureServerTiming("EVENT_QUERY", () =>
    prisma.event.findUnique({
      where: { slug },
      select: {
        venue: true,
        packages: {
          where: {
            code: "SEP20",
            active: true,
          },
          take: 1,
          select: {
            name: true,
          },
        },
      },
    }),
  );
  const supabaseUserPromise = getVerifiedSupabaseUser().catch(() => null);
  const [event, supabaseUser] = await Promise.all([
    eventPromise,
    supabaseUserPromise,
  ]);

  if (!event) {
    notFound();
  }

  const eventPackage = event.packages[0];
  const memberUser = supabaseUser
    ? await ensureMemberUser(supabaseUser).catch(() => null)
    : null;
  const activeMemberUser =
    memberUser && memberUser.status === "ACTIVE" && !memberUser.deletedAt
      ? memberUser
      : null;

  if (activeMemberUser && !isMemberProfileComplete(activeMemberUser)) {
    redirect(`/account/onboarding?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const vehicles = activeMemberUser
    ? await measureServerTiming("GARAGE_QUERY", () =>
        prisma.vehicle.findMany({
          where: {
            userId: activeMemberUser.id,
            deletedAt: null,
          },
          orderBy: [
            {
              isPrimary: "desc",
            },
            {
              createdAt: "asc",
            },
            {
              id: "asc",
            },
          ],
          select: {
            id: true,
            brand: true,
            model: true,
            plateNumber: true,
            isPrimary: true,
          },
        }),
      )
    : [];

  const defaultVehicle = vehicles.find((vehicle) => vehicle.isPrimary) ?? vehicles[0];

  return (
    <main className="min-h-screen bg-ats-black text-ats-text">
      <section className="border-b border-ats-border bg-ats-black">
        <PublicNav />

        <div className="mx-auto grid max-w-6xl gap-8 px-6 pb-14 pt-12 sm:px-8 lg:grid-cols-[1fr_0.7fr] lg:items-end lg:px-10 lg:pb-20 lg:pt-16">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-ats-blue">
              {event.venue} · 20 Eylül 2026 Pazar
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-black leading-none text-ats-text sm:text-7xl">
              Kula MyTrack Pist Etkinliği Başvuru
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-ats-muted">
              ATS etkinlik başvuruları artık doğrulanmış üye hesabı ve dijital
              garaj üzerinden alınır. Kimlik ve araç bilgileriniz güvenli üye
              kayıtlarınızdan alınır.
            </p>
          </div>

          <div className="rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-ats-muted">
              Paket
            </p>
            <h2 className="mt-3 text-2xl font-black text-ats-text">
              {eventPackage?.name === "Sunday Track Day"
                ? "Pazar Pist Günü"
                : eventPackage?.name ?? "Pazar Pist Günü"}
            </h2>
            <p className="mt-3 text-sm font-bold text-ats-blue">
              Üye hesabı ve manuel ödeme onayı ile kesinleşir.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
        <aside className="space-y-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-ats-blue">
              20 Eylül 2026 Pazar
            </p>
            <h2 className="mt-3 text-3xl font-black text-ats-text">
              Kula MyTrack Track Day
            </h2>
          </div>
          <p className="text-sm leading-6 text-ats-muted">
            Başvurunuz gönderildiğinde profil ve araç bilgileriniz kayıt anındaki
            haliyle saklanır. Daha sonra profil veya araç güncellemeniz bu
            başvuru kaydını değiştirmez.
          </p>
        </aside>

        {eventPackage ? (
          registrationContent({
            memberUser: activeMemberUser,
            vehicles,
            defaultVehicleId: defaultVehicle?.id ?? null,
            returnTo,
          })
        ) : (
          <ClosedRegistration />
        )}
      </section>

      <FooterCredit />
    </main>
  );
}

function registrationContent({
  memberUser,
  vehicles,
  defaultVehicleId,
  returnTo,
}: {
  memberUser: Awaited<ReturnType<typeof ensureMemberUser>> | null;
  vehicles: Array<{
    id: string;
    brand: string;
    model: string;
    plateNumber: string;
    isPrimary: boolean;
  }>;
  defaultVehicleId: string | null;
  returnTo: string;
}) {
  if (!memberUser) {
    return <MemberAccessCard returnTo={returnTo} />;
  }

  if (!memberUser.profile?.fullName || !memberUser.profile.phone) {
    return <MemberAccessCard returnTo={returnTo} />;
  }

  if (!defaultVehicleId) {
    return <GarageRequiredCard returnTo={returnTo} />;
  }

  return (
    <RegistrationForm
      member={{
        fullName: memberUser.profile.fullName,
        email: memberUser.email,
        phone: memberUser.profile.phone,
      }}
      vehicles={vehicles}
      defaultVehicleId={defaultVehicleId}
    />
  );
}

function MemberAccessCard({ returnTo }: { returnTo: string }) {
  const encodedReturnTo = encodeURIComponent(returnTo);

  return (
    <section className="rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft sm:p-8">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-ats-blue">
        Üye girişi gerekli
      </p>
      <h2 className="mt-3 text-3xl font-black text-ats-text">
        Etkinliğe katılmak için giriş yapın.
      </h2>
      <p className="mt-4 text-sm leading-6 text-ats-muted">
        ATS etkinlik başvuruları artık doğrulanmış üye hesabı ile alınır. Üye
        girişi yaptıktan sonra bu sayfaya geri dönerek başvurunuzu
        tamamlayabilirsiniz.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href={`/auth/login?returnTo=${encodedReturnTo}`}
          className="inline-flex h-12 items-center justify-center rounded-full bg-ats-blue px-6 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover"
        >
          Giriş Yap
        </Link>
        <Link
          href={`/auth/sign-up?returnTo=${encodedReturnTo}`}
          className="inline-flex h-12 items-center justify-center rounded-full border border-ats-border px-6 text-sm font-black text-ats-text transition hover:border-ats-blue hover:text-ats-blue"
        >
          Üye Ol
        </Link>
      </div>
    </section>
  );
}

function GarageRequiredCard({ returnTo }: { returnTo: string }) {
  const encodedReturnTo = encodeURIComponent(returnTo);

  return (
    <section className="rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft sm:p-8">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-ats-blue">
        Garaj gerekli
      </p>
      <h2 className="mt-3 text-3xl font-black text-ats-text">
        Etkinlik kaydı için önce garajınıza bir araç ekleyin.
      </h2>
      <p className="mt-4 text-sm leading-6 text-ats-muted">
        Araç bilgisi başvuru anında kayıt üzerine sabitlenir. Garajınızdaki
        aktif araçlardan birini seçerek başvuru yapabilirsiniz.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href={`/account/garage/new?returnTo=${encodedReturnTo}`}
          className="inline-flex h-12 items-center justify-center rounded-full bg-ats-blue px-6 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover"
        >
          Araç Ekle
        </Link>
        <Link
          href="/account/garage"
          className="inline-flex h-12 items-center justify-center rounded-full border border-ats-border px-6 text-sm font-black text-ats-text transition hover:border-ats-blue hover:text-ats-blue"
        >
          Garajım
        </Link>
      </div>
    </section>
  );
}

function ClosedRegistration() {
  return (
    <section className="rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft sm:p-8">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-ats-blue">
        Kayıt kapalı
      </p>
      <h2 className="mt-3 text-3xl font-black text-ats-text">
        Pazar Pist Günü kaydı henüz açık değil.
      </h2>
      <p className="mt-4 text-sm leading-6 text-ats-muted">
        Kayıt alınabilmesi için etkinlik paketinin aktif olması gerekir.
      </p>
    </section>
  );
}
