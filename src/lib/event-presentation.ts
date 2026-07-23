import { kulaEventScheduleItems } from "@/lib/event-config";

export const kulaEventPresentation = {
  hero: {
    imagePath: "/images/events/kula-mytrack-2026/event-hero-i20n.jpg",
    imageAlt: "Hyundai i20 N gün batımında Kula MyTrack pistinde",
    eyebrow: "KULA MYTRACK",
    title: "Kontrollü pist zamanı. Gerçek sürüş deneyimi.",
    body: "Limitlerini güvenli, disiplinli ve doğru toplulukla keşfet.",
  },
  concept: {
    imagePath:
      "/images/events/kula-mytrack-2026/event-gallery-ats-lineup.jpg",
    imageAlt:
      "IONIQ 5 N, Honda Civic Type R ve Hyundai i20 N Kula MyTrack alanında",
    title: "Kalabalık değil, kontrollü pist zamanı.",
    body:
      "Kula MyTrack günü; sınırlı katılım, net briefing, düzenli seans " +
      "akışı ve güvenli sürüş kültürü üzerine kurulur. Amaç pistte daha " +
      "çok otomobil göstermek değil, her sürücünün daha temiz ve daha " +
      "bilinçli zaman geçirmesini sağlamaktır.",
  },
  experience: [
    {
      title: "Kontrollü seans yapısı",
      body:
        "Katılım sınırlı tutulur; pist çıkışları gün içindeki operasyon " +
        "akışına göre yönetilir.",
    },
    {
      title: "Sürücü briefingi",
      body:
        "Bayraklar, pist disiplini, geçiş yaklaşımı ve paddock akışı gün " +
        "başlamadan netleşir.",
    },
    {
      title: "Pist operasyonu",
      body:
        "Kayıt, teknik gözlem ve QR check-in akışı sahada hızlı karar " +
        "vermeyi destekler.",
    },
    {
      title: "Topluluk deneyimi",
      body:
        "Amaç tur zamanı kovalamak değil; doğru kültürle daha temiz, daha " +
        "bilinçli sürüş zamanı üretmek.",
    },
  ],
  schedule: kulaEventScheduleItems,
  requirements: [
    "Geçerli sürücü belgesi ve tamamlanmış dijital kayıt gerekir.",
    "Araç yol kullanımına uygun, emniyet kemerli ve temel mekanik kontrolleri yapılmış olmalıdır.",
    "Lastik, fren ve sıvı durumu piste çıkış öncesi sürüşe uygun seviyede olmalıdır.",
    "Kask, yolcu, yaş ve gürültü kuralları etkinlik öncesi operasyon duyurusunda kesinleştirilir.",
    "Briefing ve pist görevlisi yönlendirmeleri tüm katılımcılar için bağlayıcıdır.",
  ],
  included: [
    "Kula MyTrack pist erişimi",
    "Sürücü briefingi ve operasyon akışı",
    "Dijital kayıt ve QR check-in",
    "Sınırlı katılımcı yapısına göre seans planı",
    "Paddock yönlendirmesi ve etkinlik günü destek akışı",
  ],
  faq: [
    {
      question: "Kimler katılabilir?",
      answer:
        "Dijital kaydı tamamlanan, geçerli sürücü belgesine sahip ve etkinlik operasyon kurallarını kabul eden sürücüler katılabilir.",
    },
    {
      question: "Kask gerekli mi?",
      answer:
        "Kask ve ekipman kuralları etkinlik öncesi operasyon duyurusunda netleştirilir; duyurudaki kural piste çıkış için esas alınır.",
    },
    {
      question: "Araçta modifikasyon şart mı?",
      answer:
        "Hayır. Yol otomobiliyle katılım mümkündür; önemli olan aracın bakımlı, güvenli ve pist akışına uygun durumda olmasıdır.",
    },
    {
      question: "Yanımda misafir getirebilir miyim?",
      answer:
        "Misafir ve yolcu kuralları kontenjan, paddock düzeni ve güvenlik planına göre etkinlik öncesi duyurulur.",
    },
    {
      question: "Ödeme nasıl yapılır?",
      answer:
        "Başvuru alındıktan sonra ödeme ve kesin onay süreci ekip tarafından manuel olarak tamamlanır.",
    },
    {
      question: "İptal veya hava şartları nasıl yönetilir?",
      answer:
        "İptal, iade ve hava şartlarına bağlı operasyon kararları etkinlik koşulları ve güncel duyuru üzerinden paylaşılır.",
    },
  ],
} as const;

export function getKulaEventPresentation() {
  return kulaEventPresentation;
}
