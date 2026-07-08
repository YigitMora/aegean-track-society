import Link from "next/link";
import { FooterCredit } from "@/components/footer-credit";
import { prisma } from "@/lib/prisma";

type PaymentSuccessPageProps = {
  searchParams: Promise<{
    registrationId?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function PaymentSuccessPage({
  searchParams,
}: PaymentSuccessPageProps) {
  const { registrationId } = await searchParams;
  const registration = registrationId
    ? await prisma.registration.findFirst({
        where: {
          id: registrationId,
          status: "CONFIRMED",
          paymentStatus: "PAID",
        },
        select: {
          participantCode: true,
          fullName: true,
        },
      })
    : null;

  return (
    <main className="min-h-screen bg-paddock">
      <section className="bg-asphalt text-white">
        <div className="mx-auto max-w-4xl px-6 py-24 sm:px-8 lg:px-10">
          <p className="text-sm font-semibold uppercase text-signal">
            Payment confirmed
          </p>
          <h1 className="mt-5 text-5xl font-black leading-none sm:text-7xl">
            Your registration is complete.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
            Payment confirmed. Your registration is complete. A confirmation
            email with your QR code has been sent.
          </p>
          {registration?.participantCode ? (
            <div className="mt-8 rounded-lg border border-white/15 bg-white/10 p-5">
              <p className="text-sm font-semibold uppercase text-white/60">
                Participant code
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {registration.participantCode}
              </p>
            </div>
          ) : null}
          <Link
            href="/events/kula-mytrack-2026"
            className="mt-10 inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-black text-asphalt transition hover:bg-signal"
          >
            Back to event
          </Link>
        </div>
      </section>
      <FooterCredit />
    </main>
  );
}
