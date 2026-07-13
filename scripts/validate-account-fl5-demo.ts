import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

const files = {
  account: read("src/app/account/page.tsx"),
  data: read("src/lib/rating-discovery.ts"),
  component: read("src/components/rating-discovery/account-rating-demo.tsx"),
  index: read("src/components/rating-discovery/index.ts"),
};
const allSource = Object.values(files).join("\n");

const checks = [
  {
    name: "account page renders compact FL5 demo in left column",
    pass:
      files.account.includes("AccountRatingDemo") &&
      files.account.includes("fl5AccountRatingDemo") &&
      files.account.indexOf("Hesabınız hazır.") <
        files.account.lastIndexOf("<AccountRatingDemo") &&
      files.account.lastIndexOf("<AccountRatingDemo") <
        files.account.lastIndexOf("Üyelik kimliği"),
  },
  {
    name: "account page removes duplicate right-column discovery banner",
    pass:
      !files.account.includes("RatingDiscoveryBanner") &&
      !files.account.includes("getRatingDiscoveryBannerData"),
  },
  {
    name: "account page avoids duplicate active vehicle queries",
    pass:
      files.account.includes("prisma.vehicle.findMany") &&
      !files.account.includes("prisma.vehicle.count") &&
      !files.account.includes("prisma.vehicle.findFirst") &&
      files.account.includes("resolveAccountFl5DemoCta"),
  },
  {
    name: "FL5 builder resolves stable production vehicle definition",
    pass:
      files.data.includes("getFl5AccountRatingDemo") &&
      files.data.includes('vehicleCode: "honda_civic_type_r_fl5"') &&
      files.data.includes('vehicleLabel: "Honda Civic Type R FL5"'),
  },
  {
    name: "FL5 builder uses centralized rating calculation",
    pass:
      files.data.includes("calculateVehiclePerformanceRating") &&
      files.data.includes("getVehicleRatingDiscoveryDemo") &&
      !files.component.includes("calculateVehiclePerformanceRating") &&
      !files.component.includes("powerRating +"),
  },
  {
    name: "FL5 builder validates active compatible catalog selections",
    pass:
      files.data.includes("active: true") &&
      files.data.includes("evaluateModificationBatchAvailability") &&
      files.data.includes("hasNamedProviderEcuTuneForVehicle") &&
      files.data.includes("hasNamedProviderTurboForVehicle") &&
      files.data.includes("keepDemoRatingBelowMaximum") &&
      files.data.includes("selectedDefinitions.length === 0") &&
      files.data.includes("safeSelectedDefinitions.length === 0"),
  },
  {
    name: "FL5 demo uses a balanced curated candidate set",
    pass:
      files.data.includes("fl5AccountDemoCandidateCodeGroups") &&
      files.data.includes("tune_hondata_fl5_flashpro_stage_1") &&
      files.data.includes("intercooler_wagner_tuning_competition") &&
      files.data.includes("oil_cooler_hks_kit") &&
      files.data.includes("suspension_coilover_kw_v3") &&
      files.data.includes("brake_pad_ebc_sr21") &&
      files.data.includes("brake_fluid_castrol_react_srf_racing") &&
      files.data.includes("brake_lines_goodridge_braided") &&
      files.data.includes("tyre_nankang_cr_s") &&
      !files.data.includes("turbo_prl_p700_fl5"),
  },
  {
    name: "demo stays read-only and never persists modifications",
    pass:
      !files.data.includes("vehicleModification.create") &&
      !files.data.includes("vehicleModification.createMany") &&
      !files.data.includes("vehicleModification.upsert") &&
      !files.data.includes("prisma.vehicleModification"),
  },
  {
    name: "compact component includes requested copy and labels",
    pass:
      files.component.includes("FL5 ne kadar gelişebilir?") &&
      files.component.includes("Stok") &&
      files.component.includes("Track Build") &&
      files.component.includes("Örnek parçalar") &&
      files.component.includes("Güç") &&
      files.component.includes("Yol Tutuş") &&
      files.component.includes("Fren") &&
      files.component.includes("Termal"),
  },
  {
    name: "compact component displays stock/build/delta without local rating math",
    pass:
      files.component.includes("demo.stockRating.overall") &&
      files.component.includes("demo.buildRating.overall") &&
      files.component.includes("demo.formattedOverallDelta") &&
      !files.component.includes("weightedOverall") &&
      !files.component.includes("calculateVehicleOverall"),
  },
  {
    name: "component shows a bounded compact part chip list",
    pass:
      files.component.includes("demo.parts.slice(0, 4)") &&
      files.component.includes("hiddenPartCount") &&
      files.component.includes("parça"),
  },
  {
    name: "CTA behavior is state-aware and uses the homepage anchor",
    pass:
      files.data.includes("resolveAccountFl5DemoCta") &&
      files.data.includes("İlk Aracımı Ekle") &&
      files.data.includes("İlk Modifikasyonu Ekle") &&
      files.data.includes("Build Profilimi Aç") &&
      files.data.includes("Garajımı Aç") &&
      files.component.includes('href="/#ats-rating-how-it-works"'),
  },
  {
    name: "analytics hooks are present",
    pass:
      allSource.includes("account_fl5_demo_viewed") &&
      allSource.includes("account_fl5_demo_garage_clicked") &&
      allSource.includes("account_fl5_demo_how_it_works_clicked"),
  },
  {
    name: "accessibility hooks are present",
    pass:
      files.component.includes('role="img"') &&
      files.component.includes('role="meter"') &&
      files.component.includes("aria-valuenow") &&
      files.component.includes("aria-labelledby") &&
      files.component.includes("focus:ring"),
  },
  {
    name: "mobile and desktop layout safeguards are present",
    pass:
      files.account.includes("lg:sticky") &&
      files.account.includes("lg:top-28") &&
      files.component.includes("min-w-0") &&
      files.component.includes("flex-wrap") &&
      files.component.includes("overflow-hidden"),
  },
  {
    name: "component has no external image or placeholder",
    pass:
      !files.component.includes("http://") &&
      !files.component.includes("https://") &&
      !files.component.includes("<img") &&
      !files.component.includes("next/image"),
  },
  {
    name: "component is exported through the rating discovery barrel",
    pass: files.index.includes("AccountRatingDemo"),
  },
];

const failedChecks = checks.filter((check) => !check.pass);

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.name}`);
}

if (failedChecks.length > 0) {
  throw new Error(
    `Account FL5 demo validation failed: ${failedChecks
      .map((check) => check.name)
      .join(", ")}`,
  );
}
