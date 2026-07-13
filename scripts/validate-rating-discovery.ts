import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

const files = {
  data: read("src/lib/rating-discovery.ts"),
  homepage: read("src/app/page.tsx"),
  garage: read("src/app/account/garage/page.tsx"),
  lifecycle: read("src/components/garage-vehicle-lifecycle.tsx"),
  hero: read("src/components/rating-discovery/rating-discovery-hero.tsx"),
  demo: read("src/components/rating-discovery/build-impact-demo.tsx"),
  bars: read("src/components/rating-discovery/rating-component-bars.tsx"),
  banner: read("src/components/rating-discovery/rating-discovery-banner.tsx"),
  steps: read("src/components/rating-discovery/rating-discovery-steps.tsx"),
  parts: read("src/components/rating-discovery/real-parts-cloud.tsx"),
  account: read("src/app/account/page.tsx"),
  registrations: read("src/app/account/registrations/page.tsx"),
  profile: read("src/app/account/profile/page.tsx"),
};
const allSource = Object.values(files).join("\n");

const checks = [
  {
    name: "reusable rating discovery components exist",
    pass:
      files.hero.includes("RatingDiscoveryHero") &&
      files.demo.includes("BuildImpactDemo") &&
      files.banner.includes("RatingDiscoveryBanner") &&
      files.steps.includes("RatingDiscoverySteps") &&
      files.parts.includes("RealPartsCloud"),
  },
  {
    name: "demo uses centralized rating calculation",
    pass:
      files.data.includes("calculateVehiclePerformanceRating") &&
      !files.demo.includes("powerRating +") &&
      !files.hero.includes("powerRating +"),
  },
  {
    name: "demo uses Focus RS Mk3 catalog template",
    pass:
      files.data.includes('code: "ford_focus_rs_mk3"') &&
      files.demo.includes("Örnek ATS Build") === false &&
      files.data.includes("Örnek ATS Build"),
  },
  {
    name: "demo respects compatibility and slot validation",
    pass:
      files.data.includes("evaluateModificationBatchAvailability") &&
      files.data.includes("demoCandidateCodeGroups") &&
      files.data.includes("mountune_focus_rs_mk3_m380") &&
      files.data.includes("mountune_focus_rs_mk3_m365"),
  },
  {
    name: "demo does not persist modifications",
    pass:
      !files.data.includes("vehicleModification.create") &&
      !files.data.includes("vehicleModification.createMany") &&
      !files.data.includes("vehicleModification.upsert"),
  },
  {
    name: "rating tones and component display helpers are reused",
    pass:
      files.bars.includes("ratingToneForScore") &&
      files.bars.includes("ratingComponentRows") &&
      files.lifecycle.includes("ratingToneForScore") &&
      files.lifecycle.includes("ratingComponentRows"),
  },
  {
    name: "homepage includes discovery, demo, catalog, steps before final CTA",
    pass:
      files.homepage.indexOf("Neden Aegean Track Society?") <
        files.homepage.lastIndexOf("RatingDiscoveryHero") &&
      files.homepage.lastIndexOf("RatingDiscoveryHero") <
        files.homepage.lastIndexOf("BuildImpactDemo") &&
      files.homepage.lastIndexOf("BuildImpactDemo") <
        files.homepage.lastIndexOf("RealPartsCloud") &&
      files.homepage.lastIndexOf("RealPartsCloud") <
        files.homepage.lastIndexOf("RatingDiscoverySteps") &&
      files.homepage.lastIndexOf("RatingDiscoverySteps") <
        files.homepage.lastIndexOf("Hazırsan"),
  },
  {
    name: "garage does not render full promotional discovery sections",
    pass:
      !files.garage.includes("RatingDiscoveryHero") &&
      !files.garage.includes("BuildImpactDemo") &&
      !files.garage.includes("RatingDiscoverySteps") &&
      !files.garage.includes("RealPartsCloud") &&
      files.garage.indexOf("Garaj kapasitesi") <
        files.garage.lastIndexOf("GarageVehicleLifecycle"),
  },
  {
    name: "empty garage state is compact and operational",
    pass:
      files.lifecycle.includes("Garajınız henüz boş") &&
      files.lifecycle.includes(
        "Etkinlik başvurularında kullanmak veya ATS Rating profilini oluşturmak",
      ) &&
      files.lifecycle.includes("İlk Aracımı Ekle") &&
      files.lifecycle.includes("ATS Rating nasıl çalışır?") &&
      !files.lifecycle.includes("Projected rating değişimini takip et") &&
      !files.lifecycle.includes("Örnek Build'i İncele"),
  },
  {
    name: "catalog-free vehicles do not render fake bars",
    pass:
      files.lifecycle.includes("Katalog dışı araç") &&
      files.lifecycle.includes("ATS Rating ve uyumlu") &&
      files.lifecycle.includes("showBars={mode === \"active\"}"),
  },
  {
    name: "compact banners appear only on selected account pages",
    pass:
      files.account.includes("RatingDiscoveryBanner") &&
      files.registrations.includes("RatingDiscoveryBanner") &&
      files.profile.includes("RatingDiscoveryBanner") &&
      !files.homepage.includes("RatingDiscoveryBanner"),
  },
  {
    name: "homepage CTA labels are authentication aware",
    pass:
      files.data.includes("Üye Ol ve Garajını Oluştur") &&
      files.data.includes("İlk Aracımı Ekle") &&
      files.data.includes("Build Profilimi Geliştir") &&
      files.data.includes("Garajımı Aç"),
  },
  {
    name: "analytics data attributes are present",
    pass:
      allSource.includes("rating_discovery_viewed") &&
      allSource.includes("rating_discovery_add_vehicle_clicked") &&
      allSource.includes("rating_discovery_demo_viewed") &&
      allSource.includes("rating_discovery_build_clicked"),
  },
  {
    name: "accessibility labels and meters are present",
    pass:
      files.bars.includes('role="meter"') &&
      files.bars.includes("aria-valuenow") &&
      files.demo.includes('role="img"') &&
      files.hero.includes("focus:ring"),
  },
  {
    name: "reduced motion support is present",
    pass:
      files.bars.includes("motion-reduce:transition-none") &&
      files.demo.includes("motion-reduce") === false &&
      files.steps.includes("motion-reduce"),
  },
  {
    name: "vehicle artwork uses local future asset slot only",
    pass:
      files.demo.includes("public/images/rating-demo/focus-rs-mk3.webp") &&
      !files.demo.includes("http://") &&
      !files.demo.includes("https://"),
  },
  {
    name: "no hardcoded 78 to 86 final result",
    pass:
      !files.data.includes("78") &&
      !files.data.includes("86") &&
      !files.demo.includes("78") &&
      !files.demo.includes("86"),
  },
];

const failedChecks = checks.filter((check) => !check.pass);

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.name}`);
}

if (failedChecks.length > 0) {
  throw new Error(
    `Rating discovery validation failed: ${failedChecks
      .map((check) => check.name)
      .join(", ")}`,
  );
}
