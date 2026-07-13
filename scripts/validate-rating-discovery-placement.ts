import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

const homepage = read("src/app/page.tsx");
const garage = read("src/app/account/garage/page.tsx");
const lifecycle = read("src/components/garage-vehicle-lifecycle.tsx");
const data = read("src/lib/rating-discovery.ts");

const checks = [
  {
    name: "Garage no longer imports or renders full discovery hero",
    pass:
      !garage.includes("RatingDiscoveryHero") &&
      !garage.includes("getRatingDiscoveryHomepageContent") &&
      !garage.includes("getRatingDiscoveryShowcaseContent"),
  },
  {
    name: "Garage no longer renders Focus RS demo",
    pass: !garage.includes("BuildImpactDemo") && !garage.includes("focus-rs-demo"),
  },
  {
    name: "Garage no longer renders steps or parts cloud",
    pass:
      !garage.includes("RatingDiscoverySteps") &&
      !garage.includes("RealPartsCloud"),
  },
  {
    name: "Garage keeps compact operational hierarchy",
    pass:
      garage.indexOf("Garaj kapasitesi") > 0 &&
      garage.indexOf("Garaj kapasitesi") <
        garage.lastIndexOf("<GarageMessage") &&
      garage.lastIndexOf("<GarageMessage") <
        garage.lastIndexOf("<GarageVehicleLifecycle"),
  },
  {
    name: "Garage empty state is concise",
    pass:
      lifecycle.includes("Garajınız henüz boş") &&
      lifecycle.includes("İlk Aracımı Ekle") &&
      lifecycle.includes("ATS Rating nasıl çalışır?") &&
      !lifecycle.includes("Base ratingini gör") &&
      !lifecycle.includes("Örnek Build'i İncele"),
  },
  {
    name: "Vehicle build CTAs remain",
    pass:
      lifecycle.includes("İlk Modifikasyonu Ekle") &&
      lifecycle.includes("Build Profilini Aç") &&
      lifecycle.includes("rating_discovery_build_clicked"),
  },
  {
    name: "Catalog-free vehicle messaging remains",
    pass:
      lifecycle.includes("Katalog dışı araç") &&
      lifecycle.includes("ATS Rating ve uyumlu") &&
      lifecycle.includes("Katalog eşleştirmesi iste"),
  },
  {
    name: "Homepage renders full discovery after primary content",
    pass:
      homepage.indexOf("Neden Aegean Track Society?") <
        homepage.lastIndexOf("RatingDiscoveryHero") &&
      homepage.lastIndexOf("RatingDiscoveryHero") <
        homepage.lastIndexOf("BuildImpactDemo") &&
      homepage.lastIndexOf("BuildImpactDemo") <
        homepage.lastIndexOf("RealPartsCloud") &&
      homepage.lastIndexOf("RealPartsCloud") <
        homepage.lastIndexOf("RatingDiscoverySteps"),
  },
  {
    name: "Homepage CTA logic is state aware",
    pass:
      data.includes("getRatingDiscoveryHomepageContent") &&
      data.includes("Üye Ol ve Garajını Oluştur") &&
      data.includes("İlk Aracımı Ekle") &&
      data.includes("Build Profilimi Geliştir") &&
      data.includes("Garajımı Aç"),
  },
  {
    name: "Focus RS demo builder remains centralized and read-only",
    pass:
      data.includes('vehicleCode: "ford_focus_rs_mk3"') &&
      data.includes("calculateVehiclePerformanceRating") &&
      data.includes("evaluateModificationBatchAvailability") &&
      !data.includes("vehicleModification.create") &&
      !data.includes("vehicleModification.upsert"),
  },
];

const failedChecks = checks.filter((check) => !check.pass);

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.name}`);
}

if (failedChecks.length > 0) {
  throw new Error(
    `Rating discovery placement validation failed: ${failedChecks
      .map((check) => check.name)
      .join(", ")}`,
  );
}
