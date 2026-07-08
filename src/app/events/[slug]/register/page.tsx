import Link from "next/link";
import { notFound } from "next/navigation";
import { FooterCredit } from "@/components/footer-credit";
import { RegistrationForm } from "@/components/registration-form";
import { prisma } from "@/lib/prisma";

type RegisterPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      days: {
        orderBy: { date: "asc" },
      },
      packages: {
        where: {
          code: "SEP20",
          active: true,
        },
        take: 1,
      },
    },
  });

  if (!event) {
    notFound();
  }

  const eventPackage = event.packages[0];

  return (
    <main className="min-h-screen bg-paddock">
      <section className="bg-asphalt text-white">
        <div className="mx-auto max-w-6xl px-6 py-6 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between">
            <Link href="/" className="text-sm font-semibold uppercase">
              Aegean Track Days
            </Link>
            <Link
              href={`/events/${event.slug}`}
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white hover:text-asphalt"
            >
              Event detail
            </Link>
          </header>

          <div className="grid gap-8 pb-12 pt-16 lg:grid-cols-[1fr_0.7fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase text-signal">
                {event.venue} · Sunday, 20 September 2026
              </p>
              <h1 className="mt-5 text-5xl font-black leading-none sm:text-7xl">
                Register for Kula MyTrack
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
                Submit your driver, vehicle, emergency contact, and consent
                details for the Sunday Track Day.
              </p>
            </div>

            <div className="rounded-lg border border-white/15 bg-white/10 p-6">
              <p className="text-sm font-semibold uppercase text-white/60">
                Package
              </p>
              <h2 className="mt-3 text-2xl font-black">
                {eventPackage?.name ?? "Sunday Track Day"}
              </h2>
              <p className="mt-3 text-sm font-semibold text-white/70">
                Online payment is not currently active.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
        <aside className="space-y-5">
          <div>
            <p className="text-sm font-semibold uppercase text-kerb">
              Sunday, 20 September 2026
            </p>
            <h2 className="mt-2 text-3xl font-black text-asphalt">
              Kula MyTrack
            </h2>
          </div>
          <p className="text-sm leading-6 text-steel">
            Capacity is checked before every registration. Pending registrations
            reserve a place while our team confirms payment manually.
          </p>
        </aside>

        {eventPackage ? (
          <RegistrationForm />
        ) : (
          <section className="rounded-lg border border-black/10 bg-white p-6 shadow-soft sm:p-8">
            <p className="text-sm font-semibold uppercase text-kerb">Registration unavailable</p>
            <h2 className="mt-3 text-3xl font-black text-asphalt">
              Sunday Track Day registration is not open.
            </h2>
            <p className="mt-4 text-sm leading-6 text-steel">
              The event package needs to be active before registrations can be
              received.
            </p>
          </section>
        )}
      </section>

      <FooterCredit />
    </main>
  );
}
