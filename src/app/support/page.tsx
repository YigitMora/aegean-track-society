import { FooterCredit } from "@/components/footer-credit";
import { PublicNav } from "@/components/public-nav";

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-ats-black text-ats-text">
      <PublicNav />
      <section className="mx-auto max-w-4xl px-6 py-16 sm:px-8 lg:px-10 lg:py-24">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-ats-blue">Destek</p>
        <h1 className="mt-5 text-4xl font-black leading-tight sm:text-6xl">Aegean Track Society desteği</h1>
        <p className="mt-8 text-base leading-8 text-ats-muted">
          Hesap, etkinlik kaydı ve uygulama desteği için bize ulaşabilirsiniz.
        </p>
        <a className="mt-8 inline-flex rounded-md border border-ats-blue/40 px-5 py-3 font-bold text-ats-text hover:border-ats-blue" href="mailto:societyaegean@gmail.com">
          societyaegean@gmail.com
        </a>
        <p className="mt-8 text-sm leading-6 text-ats-muted">
          Hukuki başvuru ve veri sorumlusu iletişim bilgileri hukuk onayı sonrası ilgili hukuki dokümanlarda yayımlanacaktır.
        </p>
      </section>
      <FooterCredit />
    </main>
  );
}
