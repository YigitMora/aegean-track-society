import Link from "next/link";
import { FooterCredit } from "@/components/footer-credit";

export default function PaymentFailurePage() {
  return (
    <main className="min-h-screen bg-paddock">
      <section className="bg-asphalt text-white">
        <div className="mx-auto max-w-4xl px-6 py-24 sm:px-8 lg:px-10">
          <p className="text-sm font-semibold uppercase text-kerb">
            Payment failed
          </p>
          <h1 className="mt-5 text-5xl font-black leading-none sm:text-7xl">
            Payment could not be verified.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
            The payment was not confirmed by iyzico, or the payment details did
            not match the registration. Please try the registration again.
          </p>
          <Link
            href="/events/kula-mytrack-2026/register"
            className="mt-10 inline-flex h-12 items-center justify-center rounded-full bg-kerb px-6 text-sm font-black text-white transition hover:bg-white hover:text-asphalt"
          >
            Try again
          </Link>
        </div>
      </section>
      <FooterCredit />
    </main>
  );
}
