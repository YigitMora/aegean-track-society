import { assertCondition, extractArrayBody, readRepoFile } from "./catalog-source-utils";

const eventPage = readRepoFile("src/app/events/[slug]/page.tsx");
const eventConfig = readRepoFile("src/lib/event-config.ts");
const registerPage = readRepoFile("src/app/events/[slug]/register/page.tsx");
const requiredSectionIds = [
  "event-hero",
  "event-facts",
  "event-concept",
  "event-experience",
  "event-schedule",
  "event-requirements",
  "event-included",
  "event-gallery",
  "event-location",
  "event-faq",
  "event-final-cta",
] as const;
const allowedEventImages = [
  "/images/events/kula-mytrack-2026/event-hero-i20n.jpg",
  "/images/events/kula-mytrack-2026/event-gallery-ats-lineup.jpg",
  "/images/events/kula-mytrack-2026/event-gallery-i20n-track.jpg",
  "/images/events/kula-mytrack-2026/event-gallery-i20n-drift.jpg",
  "/images/events/kula-mytrack-2026/event-gallery-i20n-close.jpg",
] as const;
const expectedGalleryImages = [
  "/images/events/kula-mytrack-2026/event-gallery-i20n-track.jpg",
  "/images/events/kula-mytrack-2026/event-gallery-i20n-drift.jpg",
  "/images/events/kula-mytrack-2026/event-gallery-i20n-close.jpg",
] as const;
const galleryBody = extractArrayBody(eventPage, "eventGalleryImages");
const scheduleBody = extractArrayBody(eventConfig, "kulaEventScheduleItems");
const galleryImages = Array.from(
  galleryBody.matchAll(/\bsrc:\s*"([^"]+)"/g),
  (match) => match[1],
);
const galleryObjectPositions = Array.from(
  galleryBody.matchAll(/\bimageClassName:\s*"([^"]*object-\[[^"]+)"/g),
  (match) => match[1],
);
const heroBody = eventPage.slice(
  eventPage.indexOf('id="event-hero"'),
  eventPage.indexOf('id="event-facts"'),
);
const sectionPositions = requiredSectionIds.map((id) => ({
  id,
  index: eventPage.indexOf(`id="${id}"`),
}));

for (const section of sectionPositions) {
  assertCondition(section.index >= 0, `missing section ${section.id}`);
}

for (let index = 1; index < sectionPositions.length; index += 1) {
  assertCondition(
    sectionPositions[index - 1].index < sectionPositions[index].index,
    `${sectionPositions[index].id} is out of order`,
  );
}

assertCondition(
  (heroBody.match(/<Image/g) ?? []).length === 1,
  "hero must render exactly one primary image",
);
assertCondition(
  eventPage.includes('src: "/images/events/kula-mytrack-2026/event-hero-i20n.jpg"') &&
    eventPage.includes('alt: "Hyundai i20 N gün batımında Kula MyTrack pistinde"') &&
    eventPage.includes("priority") &&
    eventPage.includes('sizes="100vw"'),
  "hero must use the dedicated i20 N image with required accessibility/performance settings",
);
assertCondition(
  eventPage.includes("eventFacts({") &&
    eventPage.includes("primaryPackage?.capacity") &&
    eventPage.includes("primaryPackage?.price") &&
    eventPage.includes("event.days[0]?.date"),
  "essential facts must derive from event/package data",
);
assertCondition(
  scheduleBody.includes("Kayıt ve karşılama") &&
    scheduleBody.includes("Teknik kontrol") &&
    scheduleBody.includes("Sürücü briefingi") &&
    scheduleBody.includes("Pist seansları") &&
    scheduleBody.includes("Gün sonu"),
  "schedule must include the expected one-source timeline stages",
);
assertCondition(
  eventPage.includes('import { kulaEventScheduleItems } from "@/lib/event-config"') &&
    eventPage.includes("kulaEventScheduleItems.map"),
  "event page must render the canonical shared schedule",
);
assertCondition(
  eventPage.includes('src: "/images/events/kula-mytrack-2026/event-gallery-ats-lineup.jpg"') &&
    eventPage.includes("IONIQ 5 N, Honda Civic Type R ve Hyundai i20 N Kula MyTrack alanında") &&
    eventPage.includes("aspect-[16/10]"),
  "event concept must use the lineup image with the requested crop container",
);
assertCondition(galleryImages.length === 3, "gallery must use exactly three curated images");
assertCondition(
  expectedGalleryImages.every((image, index) => galleryImages[index] === image),
  "gallery image order must be track, drift, close",
);
assertCondition(
  galleryObjectPositions.length === galleryImages.length,
  "every gallery image must have an intentional crop class",
);
assertCondition(
  eventPage.includes("overflow-x-hidden") &&
    eventPage.includes("md:grid-cols-12") &&
    !eventPage.includes("md:auto-rows") &&
    !eventPage.includes("masonry"),
  "page must use controlled responsive gallery layout without masonry or horizontal overflow",
);
assertCondition(
  !galleryBody.includes("absolute") &&
    !galleryBody.includes("-mt-") &&
    !galleryBody.includes("-mx-") &&
    !galleryBody.includes("row-span"),
  "gallery must not use overlapping, negative-margin, or row-span collage layout",
);
assertCondition(
  allowedEventImages.every((image) => eventPage.includes(image)),
  "event page must include all five event-specific media references",
);

for (const match of eventPage.matchAll(/\/images\/[^"]+/g)) {
  assertCondition(
    allowedEventImages.includes(match[0] as (typeof allowedEventImages)[number]) ||
      match[0].startsWith("/images/events/kula-mytrack-2026/"),
    `unexpected event page image reference ${match[0]}`,
  );
}

assertCondition(
  eventPage.includes("<details") && eventPage.includes("<summary"),
  "FAQ must use keyboard-accessible details/summary controls",
);
assertCondition(
  eventPage.includes("href={registerHref}") &&
    eventPage.includes("Etkinliğe Kaydol") &&
    eventPage.includes("Kaydı Başlat"),
  "registration CTAs must point to the existing event register route",
);
assertCondition(
  eventPage.includes("Fotoğraf, zaman ölçümü veya ek servisler yalnızca ayrıca") &&
    !eventPage.includes("garantili fotoğraf") &&
    !eventPage.includes("timing transponder included"),
  "page must avoid unconfirmed service claims",
);
assertCondition(
  registerPage.includes("RegistrationForm") &&
    registerPage.includes('export const dynamic = "force-dynamic"') &&
    !registerPage.includes("eventGalleryImages"),
  "registration page must remain a form route, not a marketing page",
);

console.log("PASS event page hierarchy follows requested order");
console.log("PASS one-image hero and database-backed facts are present");
console.log(`PASS curated gallery image count: ${galleryImages.length}`);
console.log("PASS every gallery image has explicit object-position control");
console.log("PASS FAQ and registration CTAs remain accessible");
console.log("PASS registration route remains unchanged in purpose");
