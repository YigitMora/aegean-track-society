import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import { assertCondition, extractArrayBody, readRepoFile, root } from "./catalog-source-utils";

const eventPage = readRepoFile("src/app/events/[slug]/page.tsx");
const homepage = readRepoFile("src/app/page.tsx");
const eventMediaDir = "public/images/events/kula-mytrack-2026";
const expectedMediaFiles = [
  "event-hero-i20n.jpg",
  "event-gallery-i20n-track.jpg",
  "event-gallery-i20n-close.jpg",
  "event-gallery-ats-lineup.jpg",
  "event-gallery-i20n-drift.jpg",
] as const;
const expectedEventImageRefs = expectedMediaFiles.map(
  (file) => `/images/events/kula-mytrack-2026/${file}`,
);
const expectedGalleryOrder = [
  "/images/events/kula-mytrack-2026/event-gallery-i20n-track.jpg",
  "/images/events/kula-mytrack-2026/event-gallery-i20n-drift.jpg",
  "/images/events/kula-mytrack-2026/event-gallery-i20n-close.jpg",
] as const;
const homepageImageRefs = [
  "/images/ats/FL5_Hero.jpg",
  "/images/ats/Community2.JPG",
  "/images/ats/FL5_BACK.jpg",
  "/images/ats/FL5_SIDE_COOL.jpg",
  "/images/ats/FL5_BACK2.JPG",
  "/images/ats/i20NCOOOL.JPG",
  "/images/ats/i20N_BACK.JPG",
  "/images/ats/i20NGIRL.JPG",
  "/images/ats/IONIQ5N.JPG",
] as const;
const galleryBody = extractArrayBody(eventPage, "eventGalleryImages");
const galleryRefs = Array.from(
  galleryBody.matchAll(/\bsrc:\s*"([^"]+)"/g),
  (match) => match[1],
);
const eventImageRefs = Array.from(
  eventPage.matchAll(/\/images\/[^"]+\.(?:jpg|jpeg|JPG|png|webp)/g),
  (match) => match[0],
);
const atsArchiveDiff = execFileSync("git", [
  "diff",
  "--name-status",
  "--",
  "public/images/ats",
], {
  cwd: root,
  encoding: "utf8",
});

for (const file of expectedMediaFiles) {
  const destination = resolve(root, eventMediaDir, file);

  assertCondition(existsSync(destination), `missing destination media file ${file}`);
  assertCondition(file === file.toLowerCase(), `destination filename is not lowercase: ${file}`);
}

assertCondition(
  expectedEventImageRefs.every((reference) => eventPage.includes(reference)),
  "event page does not include every event-specific media reference",
);
assertCondition(
  eventImageRefs.every((reference) =>
    expectedEventImageRefs.includes(reference as (typeof expectedEventImageRefs)[number]),
  ),
  `event page includes unexpected image references: ${eventImageRefs
    .filter(
      (reference) =>
        !expectedEventImageRefs.includes(reference as (typeof expectedEventImageRefs)[number]),
    )
    .join(", ")}`,
);
assertCondition(
  eventPage.includes('src: "/images/events/kula-mytrack-2026/event-hero-i20n.jpg"') &&
    eventPage.includes('alt: "Hyundai i20 N gün batımında Kula MyTrack pistinde"') &&
    eventPage.includes("object-[62%_50%]") &&
    eventPage.includes("sm:object-[60%_50%]") &&
    eventPage.includes("lg:object-[58%_52%]"),
  "hero image, alt text, or responsive crop positions are missing",
);
assertCondition(
  eventPage.includes("rgba(8,11,15,0.92)_0%") &&
    eventPage.includes("rgba(8,11,15,0.58)_42%") &&
    eventPage.includes("rgba(8,11,15,0.14)_100%"),
  "hero overlay must use the requested left-to-right editorial balance",
);
assertCondition(
  eventPage.includes('src: "/images/events/kula-mytrack-2026/event-gallery-ats-lineup.jpg"') &&
    eventPage.includes("aspect-[16/10]") &&
    eventPage.includes("object-[50%_58%]"),
  "concept lineup image or crop is missing",
);
assertCondition(galleryRefs.length === 3, "gallery must render exactly three images");
assertCondition(
  expectedGalleryOrder.every((reference, index) => galleryRefs[index] === reference),
  "gallery order must be track, drift, close",
);
assertCondition(
  galleryBody.includes("aspect-[16/9]") &&
    galleryBody.includes("aspect-[4/5]") &&
    galleryBody.includes("lg:aspect-[16/8]") &&
    galleryBody.includes("object-[52%_50%]") &&
    galleryBody.includes("object-[64%_50%]") &&
    galleryBody.includes("object-[50%_46%]"),
  "gallery crop positions or aspect-ratio containers are missing",
);
assertCondition(
  eventPage.includes("md:grid-cols-12") &&
    eventPage.includes("md:col-span-8") &&
    eventPage.includes("md:col-span-4") &&
    eventPage.includes("md:col-span-12") &&
    !eventPage.includes("md:auto-rows") &&
    !eventPage.includes("masonry"),
  "gallery grid must be deterministic and non-masonry",
);
assertCondition(
  !galleryBody.includes("absolute") &&
    !galleryBody.includes("-mt-") &&
    !galleryBody.includes("-mx-") &&
    !galleryBody.includes("row-span"),
  "gallery must not use overlapping or negative-margin layout",
);
assertCondition(
  homepageImageRefs.every((reference) => homepage.includes(reference)),
  "homepage image references changed or are missing",
);
assertCondition(
  !homepage.includes("/images/events/kula-mytrack-2026/"),
  "homepage must not reference event-specific media",
);

for (const line of atsArchiveDiff.split("\n").filter(Boolean)) {
  const [status, path] = line.split(/\s+/, 2);
  const isImage = /\.(?:jpe?g|png|webp|gif|cr2)$/i.test(path ?? "");

  assertCondition(
    !isImage || !["D", "R", "M"].includes(status[0] ?? ""),
    `existing ATS archive image changed: ${line}`,
  );
}

console.log(`PASS destination media files: ${expectedMediaFiles.map((file) => basename(file)).join(", ")}`);
console.log("PASS event page references only the curated Kula event media set");
console.log("PASS homepage image references remain unchanged");
console.log("PASS tracked ATS image archive has no image delete/rename/overwrite diff");
