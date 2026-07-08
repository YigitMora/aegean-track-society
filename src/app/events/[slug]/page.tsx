import Link from "next/link";
import { notFound } from "next/navigation";
import { FooterCredit } from "@/components/footer-credit";
import { prisma } from "@/lib/prisma";

type EventPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

function formatPrice(price: { toNumber: () => number }, currency: string) {
  const amount = price.toNumber();

  if (amount === 0) {
    return "Price TBA";
  }

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function EventDetailPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      days: {
        orderBy: { date: "asc" },
      },
      packages: {
        include: {
          days: {
            include: {
              eventDay: true,
            },
          },
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const orderedPackages = [...event.packages].sort((a, b) => {
    const order: Record<string, number> = { SEP20: 1 };
    return (order[a.code] ?? 99) - (order[b.code] ?? 99);
  });

  return (
    <main className="min-h-screen bg-paddock">
      <section className="bg-asphalt text-white">
        <div className="mx-auto max-w-6xl px-6 py-6 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between">
            <Link href="/" className="text-sm font-semibold uppercase">
              Aegean Track Days
            </Link>
            <Link
              href={`/events/${event.slug}/register`}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-asphalt transition hover:bg-signal"
            >
              Register Now
            </Link>
          </header>

          <div className="grid gap-10 pb-16 pt-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase text-signal">
                {event.venue}
              </p>
              <h1 className="mt-5 text-5xl font-black leading-none sm:text-7xl">
                {event.name}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
                A Sunday track day prepared for clean registration,
                manual confirmation, and focused on-site operations.
              </p>
            </div>

            <div className="rounded-lg border border-white/15 bg-white/10 p-6">
              <p className="text-sm font-semibold uppercase text-white/60">
                Event date
              </p>
              <div className="mt-4 space-y-3">
                {event.days.map((day) => (
                  <div key={day.id} className="flex items-center justify-between gap-4">
                    <span className="text-lg font-bold">{day.label}</span>
                    <span className="h-2 w-2 rounded-full bg-signal" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12 sm:px-8 lg:px-10">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase text-kerb">
              Package
            </p>
            <h2 className="mt-2 text-3xl font-black text-asphalt">Sunday Track Day package</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-steel">
            Registration is open. Online payment is not currently active; our
            team confirms payment manually after receiving your request.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {orderedPackages.map((eventPackage) => {
            const dates = eventPackage.days
              .map((link) => link.eventDay.date)
              .sort((a, b) => a.getTime() - b.getTime())
              .map(formatDate);

            return (
              <article
                key={eventPackage.id}
                className="rounded-lg border border-black/10 bg-white p-6 shadow-soft"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-asphalt">{eventPackage.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-steel">{eventPackage.code}</p>
                  </div>
                  <span className="rounded-full bg-paddock px-3 py-1 text-xs font-bold text-asphalt">
                    {eventPackage.capacity} spots
                  </span>
                </div>
                <p className="mt-6 text-2xl font-black text-kerb">
                  {formatPrice(eventPackage.price, eventPackage.currency)}
                </p>
                <div className="mt-6 space-y-2">
                  {dates.map((date) => (
                    <p key={date} className="text-sm font-semibold text-steel">
                      {date}
                    </p>
                  ))}
                </div>
                <Link
                  href={`/events/${event.slug}/register`}
                  className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-kerb px-5 text-sm font-black text-white transition hover:bg-asphalt"
                >
                  Register Now
                </Link>
              </article>
            );
          })}
        </div>
      </section>
      <FooterCredit />
    </main>
  );
}
