import { notFound } from "next/navigation";
import { FooterCredit } from "@/components/footer-credit";
import { PublicNav } from "@/components/public-nav";

const legalDocuments = {
  "kvkk-aydinlatma": {
    title: "KVKK Aydınlatma Metni",
    summary:
      "Bu sayfa, katılımcı verilerinin etkinlik kaydı ve operasyon süreçlerinde nasıl işleneceğini açıklayacak metin için ayrılmıştır.",
  },
  "privacy-policy": {
    title: "Gizlilik Politikası",
    summary:
      "Bu sayfa, ATS uygulaması ve web hizmetlerinde işlenen kişisel veriler için nihai gizlilik politikasına ayrılmıştır.",
  },
  "uyelik-sozlesmesi": {
    title: "Üyelik Sözleşmesi",
    summary:
      "Bu sayfa, ATS üyelik koşullarını açıklayan nihai sözleşme metni için ayrılmıştır.",
  },
  "account-deletion": {
    title: "Hesap Silme ve Veri İşleme",
    summary:
      "Hesap silme uygulama içinden iki aşamalı doğrulamayla başlatılır. Profil, garaj araçları ve araç fotoğrafları silinir; etkinlik kayıtları ise geçerli saklama politikası kapsamında kimlikle bağlantısı kaldırılarak anonimleştirilebilir.",
  },
  "onay-metni": {
    title: "Açık Rıza / Onay Metni",
    summary:
      "Bu sayfa, gerekli açık rıza ve kayıt onay metni için ayrılmıştır. Nihai metin hukuk danışmanı onayından sonra yayımlanmalıdır.",
  },
  "motorsporlari-katilim-beyani": {
    title: "Motorsporları Katılım ve Sorumluluk Beyanı",
    summary:
      "Bu sayfa, pist etkinliği katılım koşulları ve sorumluluk beyanı için ayrılmıştır. Nihai metin operasyon ve hukuk onayı sonrası tamamlanmalıdır.",
  },
} as const;

type LegalPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return Object.keys(legalDocuments).map((slug) => ({ slug }));
}

export default async function LegalPage({ params }: LegalPageProps) {
  const { slug } = await params;
  const document = legalDocuments[slug as keyof typeof legalDocuments];

  if (!document) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-ats-black text-ats-text">
      <PublicNav />

      <section className="mx-auto max-w-4xl px-6 py-16 sm:px-8 lg:px-10 lg:py-24">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-ats-blue">
          Taslak hukuki doküman
        </p>
        <h1 className="mt-5 text-4xl font-black leading-tight text-ats-text sm:text-6xl">
          {document.title}
        </h1>
        <div className="mt-8 rounded-lg border border-ats-blue/30 bg-ats-blue/10 p-5 text-sm font-semibold leading-6 text-ats-text">
          Bu metin taslaktır ve nihai hukuki beyan yerine geçmez. Yayına alınacak
          son metin hukuk danışmanı ve etkinlik operasyon ekibi tarafından
          onaylanmalıdır. Veri sorumlusu ve başvuru iletişim bilgileri henüz
          doğrulanmadığı için bu belge public release için yeterli değildir.
        </div>
        <div className="mt-10 space-y-6 text-base leading-8 text-ats-muted">
          <p>{document.summary}</p>
          <p>
            Nihai doküman hazırlandığında bu sayfada kapsam, veri sorumlusu,
            katılımcı hakları, saklama süreleri, etkinlik güvenliği ve kabul
            şartları açık şekilde yer alacaktır.
          </p>
        </div>
      </section>

      <FooterCredit />
    </main>
  );
}
