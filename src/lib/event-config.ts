export const kulaEventSlug = "kula-mytrack-2026";
export const kulaPackageCode = "SEP20";
export const kulaCheckInDate = new Date("2026-09-20T00:00:00.000Z");
export const kulaEventDisplayName = "Kula MyTrack";
export const kulaEventDisplayDate = "Sunday, 20 September 2026";

export const kulaEventScheduleItems = [
  {
    time: "08:30",
    title: "Kayıt ve karşılama",
    body: "Katılımcı doğrulama, araç bilgileri ve paddock yönlendirmesi.",
  },
  {
    time: "09:00",
    title: "Teknik kontrol",
    body: "Araçların piste çıkış öncesi temel operasyon uygunluğu ve ekip yönlendirmeleri.",
  },
  {
    time: "09:30",
    title: "Sürücü briefingi",
    body: "Bayraklar, pist disiplini, seans akışı ve güvenlik protokolü.",
  },
  {
    time: "10:00",
    title: "Pist seansları",
    body: "Kontrollü gruplar, net çıkış ritmi ve odaklı sürüş zamanı.",
  },
  {
    time: "17:30",
    title: "Gün sonu",
    body: "Seans kapanışı, paddock dönüşü ve operasyon kapanış kontrolleri.",
  },
] as const;

export const kulaEventPublicWindow = {
  startsAt: "2026-09-20T08:30:00+03:00",
  endsAt: "2026-09-20T17:30:00+03:00",
} as const;
