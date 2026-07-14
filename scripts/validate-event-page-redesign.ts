import {
  assertCondition,
  extractArrayBody,
  readRepoFile,
} from "./catalog-source-utils";

const eventPage = readRepoFile("src/app/events/[slug]/page.tsx");
const registerPage = readRepoFile("src/app/events/[slug]/register/page.tsx");
const photoInventory = readRepoFile("docs/ats-event-photo-inventory.md");
const requiredSectionIds = [
  "event-hero",
  "event-facts",
  "event-concept",
  "event-experience",
  "event-schedule",
  "event-requirements",
  "event-included",
  "event-location",
  "event-gallery",
  "event-faq",
  "event-final-cta",
] as const;
const galleryBody = extractArrayBody(eventPage, "eventGalleryImages");
const scheduleBody = extractArrayBody(eventPage, "eventScheduleItems");
const galleryImages = Array.from(galleryBody.matchAll(/\bsrc:\s*"([^"]+)"/g), (match) => match[1]);
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
assertCondition(galleryImages.length <= 6, "initial gallery exceeds six images");
assertCondition(galleryImages.length === 5, "initial gallery should use five curated images");
assertCondition(
  galleryObjectPositions.length === galleryImages.length,
  "every gallery image must have an intentional crop class",
);
assertCondition(
  eventPage.includes("overflow-x-hidden") &&
    eventPage.includes("md:grid-cols-12") &&
    !eventPage.includes("masonry"),
  "page must use controlled responsive gallery layout without masonry or horizontal overflow",
);
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
assertCondition(
  photoInventory.includes("Missing Asset Slots") &&
    photoInventory.includes("Paddock overview") &&
    photoInventory.includes("Driver briefing") &&
    photoInventory.includes("Check-in / registration moment"),
  "photo inventory must document missing operational asset slots",
);

console.log("PASS event page hierarchy follows requested order");
console.log("PASS one-image hero and database-backed facts are present");
console.log(`PASS curated gallery image count: ${galleryImages.length}`);
console.log("PASS every gallery image has explicit object-position control");
console.log("PASS FAQ and registration CTAs remain accessible");
console.log("PASS registration route remains unchanged in purpose");
