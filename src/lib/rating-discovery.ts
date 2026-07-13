import "server-only";

import { ModificationCategory, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  evaluateModificationBatchAvailability,
  formatModificationDefinition,
  hasNamedProviderEcuTuneForVehicle,
  hasNamedProviderTurboForVehicle,
  modificationCategoryLabels,
  type VehicleBuildVehicle,
} from "@/lib/vehicle-build-rules";
import {
  calculateVehiclePerformanceRating,
  type VehiclePerformanceRating,
  type VehicleRatingModificationInput,
} from "@/lib/vehicle-performance-rating";
import {
  formatRatingDelta,
  ratingComponentRows,
  ratingDelta,
  ratingDeltaTone,
  type RatingComponentKey,
  type RatingDeltaTone,
} from "@/lib/vehicle-rating-deltas";

export const ratingDiscoveryDisclaimer =
  "ATS Rating, araç ve build'leri karşılaştırmaya yardımcı olan tahmini bir değerlendirmedir; dyno veya resmi tur zamanı değildir.";

export type RatingDiscoveryUserState =
  | "empty"
  | "matched_unmodified"
  | "active_build"
  | "catalog_free";

export type RatingDiscoveryCta = {
  label: string;
  href: string;
  event: string;
};

export type RatingDiscoveryState = {
  state: RatingDiscoveryUserState;
  title: string;
  body: string;
  primaryCta: RatingDiscoveryCta;
  secondaryCta: RatingDiscoveryCta;
};

export type RatingDiscoveryBannerData = {
  title: string;
  body: string;
  cta: RatingDiscoveryCta;
  state: RatingDiscoveryUserState;
};

export type RatingDiscoveryCatalogShowcase = {
  categoryChips: string[];
  brandChips: string[];
};

export type RatingDiscoveryDemoPart = {
  code: string;
  label: string;
  categoryLabel: string;
  fitmentLabel: string;
};

export type RatingDiscoveryDeltaRow = {
  label: string;
  key: RatingComponentKey;
  stock: number;
  build: number;
  delta: number;
  formattedDelta: string;
  tone: RatingDeltaTone;
};

export type RatingDiscoveryDemo = {
  vehicleLabel: string;
  vehicleSubtitle: string;
  presentationLabel: string;
  sourceLabel: string;
  stockRating: VehiclePerformanceRating;
  buildRating: VehiclePerformanceRating;
  overallDelta: number;
  formattedOverallDelta: string;
  deltaRows: RatingDiscoveryDeltaRow[];
  parts: RatingDiscoveryDemoPart[];
};

type DiscoveryVehicleSummary = {
  id: string;
  vehicleDefinitionId: string | null;
  modificationCount: number;
};

const vehicleDefinitionRatingSelect = {
  id: true,
  code: true,
  brand: true,
  model: true,
  generation: true,
  chassisCode: true,
  variant: true,
  yearFrom: true,
  yearTo: true,
  powertrain: true,
  platformFamilyId: true,
  engineFamilyId: true,
  powerRating: true,
  handlingRating: true,
  brakingRating: true,
  reliabilityRating: true,
  thermalRating: true,
  trackReadinessRating: true,
  weightPenalty: true,
  ratingStatus: true,
} satisfies Prisma.VehicleDefinitionSelect;

const modificationDefinitionLabelSelect = {
  id: true,
  code: true,
  category: true,
  brand: true,
  name: true,
  variant: true,
  componentTypeCode: true,
  usageClass: true,
} satisfies Prisma.ModificationDefinitionSelect;

const modificationDefinitionDiscoverySelect = {
  ...modificationDefinitionLabelSelect,
  active: true,
  description: true,
  powerImpact: true,
  handlingImpact: true,
  brakingImpact: true,
  reliabilityImpact: true,
  trackReadinessImpact: true,
  modificationImpacts: {
    where: {
      active: true,
    },
    select: {
      vehicleDefinitionId: true,
      powerImpact: true,
      handlingImpact: true,
      brakingImpact: true,
      reliabilityImpact: true,
      thermalImpact: true,
      trackReadinessImpact: true,
      active: true,
    },
  },
  compatibilities: {
    where: {
      active: true,
    },
    select: {
      active: true,
      vehicleBrand: true,
      vehicleModel: true,
      vehicleDefinitionId: true,
      platformFamilyId: true,
      engineFamilyId: true,
      yearFrom: true,
      yearTo: true,
    },
  },
  powertrainApplicabilities: {
    where: {
      active: true,
    },
    select: {
      active: true,
      powertrain: true,
    },
  },
  requirementGroups: {
    where: {
      active: true,
    },
    select: {
      active: true,
      description: true,
      options: {
        select: {
          requiredDefinitionId: true,
          requiredDefinition: {
            select: modificationDefinitionLabelSelect,
          },
        },
      },
    },
  },
  rulesAsSource: {
    where: {
      active: true,
    },
    select: {
      active: true,
      targetDefinitionId: true,
      ruleType: true,
    },
  },
  rulesAsTarget: {
    where: {
      active: true,
    },
    select: {
      active: true,
      sourceDefinitionId: true,
      ruleType: true,
    },
  },
} satisfies Prisma.ModificationDefinitionSelect;

type DemoVehicleDefinition = Prisma.VehicleDefinitionGetPayload<{
  select: typeof vehicleDefinitionRatingSelect;
}>;

type DemoModificationDefinition = Prisma.ModificationDefinitionGetPayload<{
  select: typeof modificationDefinitionDiscoverySelect;
}>;

const demoCandidateCodeGroups = [
  ["mountune_focus_rs_mk3_m380", "mountune_focus_rs_mk3_m365"],
  ["mountune_ford_intercooler", "cooling_intercooler_upgrade"],
  ["mountune_ford_oil_cooler", "cooling_oil_cooler"],
  [
    "mountune_ford_clubsport_coilovers",
    "suspension_coilover_ohlins_road_track",
    "suspension_coilover_kw_v3",
    "suspension_coilover_kw_v2",
  ],
  ["bbk_ap_racing_6_pot", "bbk_ap_racing_4_pot", "brakes_big_brake_kit"],
  ["brake_fluid_castrol_react_srf_racing", "brakes_high_temperature_fluid"],
  ["tyre_michelin_pilot_sport_cup_2", "tyre_nankang_cr_s"],
  ["wheel_rays_volk_te37", "wheels_lightweight"],
  ["suspension_alignment_bushing_powerflex"],
] as const;

const categoryChipOrder = [
  { category: ModificationCategory.ECU, label: "ECU" },
  { category: ModificationCategory.ENGINE, label: "Turbo" },
  { category: ModificationCategory.INTAKE_EXHAUST, label: "Intake" },
  { category: ModificationCategory.INTAKE_EXHAUST, label: "Exhaust" },
  { category: ModificationCategory.COOLING, label: "Cooling" },
  { category: ModificationCategory.SUSPENSION, label: "Suspension" },
  { category: ModificationCategory.BRAKES, label: "Brakes" },
  { category: ModificationCategory.TYRES, label: "Tyres" },
  { category: ModificationCategory.WHEELS, label: "Wheels" },
  { category: ModificationCategory.DRIVETRAIN, label: "Drivetrain" },
  { category: ModificationCategory.AERO, label: "Aero" },
  { category: ModificationCategory.SAFETY, label: "Safety" },
] as const;

const catalogBrandAllowlist = [
  "Hondata",
  "KTuner",
  "Mountune",
  "RacingLine",
  "Garrett",
  "KW",
  "Ohlins",
  "AP Racing",
  "Brembo",
  "Michelin",
  "Nankang",
] as const;

export function resolveRatingDiscoveryState(
  vehicles: DiscoveryVehicleSummary[],
): RatingDiscoveryState {
  const activeBuild = vehicles.find(
    (vehicle) => vehicle.vehicleDefinitionId && vehicle.modificationCount > 0,
  );
  const matchedVehicle = vehicles.find((vehicle) => vehicle.vehicleDefinitionId);

  if (vehicles.length === 0) {
    return {
      state: "empty",
      title: "Aracının gerçek potansiyelini keşfet",
      body: "Aracını ATS kataloğundan seç, kullandığın gerçek modifikasyonları build profiline ekle ve Güç, Yol Tutuş, Fren, Güvenilirlik, Termal Yönetim ve Pist Hazırlığı puanlarındaki tahmini değişimi gör.",
      primaryCta: {
        label: "Aracımın Ratingini Keşfet",
        href: "/account/garage/new",
        event: "rating_discovery_add_vehicle_clicked",
      },
      secondaryCta: {
        label: "Nasıl Çalışır?",
        href: "#ats-rating-how-it-works",
        event: "rating_discovery_how_it_works_clicked",
      },
    };
  }

  if (activeBuild) {
    return {
      state: "active_build",
      title: "Build profilin canlı",
      body: "Mevcut parçalarınla ATS Rating dağılımını takip et ve sıradaki değişikliğin etkisini build profilinde önizle.",
      primaryCta: {
        label: "Build Profilimi Gör",
        href: `/account/garage/${activeBuild.id}#build-profile`,
        event: "rating_discovery_build_clicked",
      },
      secondaryCta: {
        label: "Nasıl Çalışır?",
        href: "#ats-rating-how-it-works",
        event: "rating_discovery_how_it_works_clicked",
      },
    };
  }

  if (matchedVehicle) {
    return {
      state: "matched_unmodified",
      title: "Base rating hazır",
      body: "Aracın ATS kataloğuyla eşleşti. Şimdi kullandığın gerçek parçaları ekleyerek projected rating değişimini görebilirsin.",
      primaryCta: {
        label: "İlk Modifikasyonu Ekle",
        href: `/account/garage/${matchedVehicle.id}#build-profile`,
        event: "rating_discovery_build_clicked",
      },
      secondaryCta: {
        label: "Nasıl Çalışır?",
        href: "#ats-rating-how-it-works",
        event: "rating_discovery_how_it_works_clicked",
      },
    };
  }

  return {
    state: "catalog_free",
    title: "Aracını ATS kataloğuyla eşleştir",
    body: "Garajındaki araç etkinlik başvurularında kullanılabilir. ATS Rating ve uyumlu modifikasyonlar için katalog eşleşmesi gerekir.",
    primaryCta: {
      label: "Garajımı Aç",
      href: "#active-garage-vehicles",
      event: "rating_discovery_build_clicked",
    },
    secondaryCta: {
      label: "Nasıl Çalışır?",
      href: "#ats-rating-how-it-works",
      event: "rating_discovery_how_it_works_clicked",
    },
  };
}

export async function getRatingDiscoveryBannerData(
  userId: string,
): Promise<RatingDiscoveryBannerData> {
  const vehicles = await prisma.vehicle.findMany({
    where: {
      userId,
      deletedAt: null,
    },
    orderBy: [
      {
        isPrimary: "desc",
      },
      {
        createdAt: "asc",
      },
    ],
    select: {
      id: true,
      vehicleDefinitionId: true,
      modifications: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
        },
      },
    },
  });
  const state = resolveRatingDiscoveryState(
    vehicles.map((vehicle) => ({
      id: vehicle.id,
      vehicleDefinitionId: vehicle.vehicleDefinitionId,
      modificationCount: vehicle.modifications.length,
    })),
  );

  if (state.state === "active_build" || state.state === "matched_unmodified") {
    return {
      state: state.state,
      title: "Build profilin hazır",
      body: "Aracını garaja ekle, gerçek modifikasyonlarını işle ve build profilindeki değişimi keşfet.",
      cta: {
        ...state.primaryCta,
        label: "Build'i Geliştir",
      },
    };
  }

  if (state.state === "catalog_free") {
    return {
      state: state.state,
      title: "Aracını ATS kataloğuyla eşleştir",
      body: "ATS Rating ve uyumlu modifikasyon özellikleri için aracını katalogla eşleştir.",
      cta: {
        label: "Garajımı Aç",
        href: "/account/garage",
        event: "rating_discovery_build_clicked",
      },
    };
  }

  return {
    state: state.state,
    title: "Aracın kaç puan?",
    body: "Aracını garaja ekle, gerçek modifikasyonlarını işle ve build profilindeki değişimi keşfet.",
    cta: {
      label: "Ratingimi Keşfet",
      href: "/account/garage",
      event: "rating_discovery_add_vehicle_clicked",
    },
  };
}

export async function getRatingDiscoveryGarageContent() {
  const [demo, catalog] = await Promise.all([
    getFocusRsRatingDiscoveryDemo(),
    getRatingDiscoveryCatalogShowcase(),
  ]);

  return {
    demo,
    catalog,
  };
}

async function getFocusRsRatingDiscoveryDemo(): Promise<RatingDiscoveryDemo | null> {
  const vehicleDefinition = await prisma.vehicleDefinition.findUnique({
    where: {
      code: "ford_focus_rs_mk3",
    },
    select: vehicleDefinitionRatingSelect,
  });

  if (!vehicleDefinition || vehicleDefinition.ratingStatus === "UNAVAILABLE") {
    return null;
  }

  const stockRating = calculateVehiclePerformanceRating({
    vehicleDefinition,
    installedModifications: [],
  });

  if (!stockRating) {
    return null;
  }

  const candidateCodes = demoCandidateCodeGroups.flat();
  const candidateDefinitions = await prisma.modificationDefinition.findMany({
    where: {
      active: true,
      code: {
        in: [...candidateCodes],
      },
    },
    select: modificationDefinitionDiscoverySelect,
  });
  const definitionsByCode = new Map(
    candidateDefinitions.map((definition) => [definition.code, definition]),
  );
  const vehicleForRules = toVehicleBuildVehicle(vehicleDefinition);
  const hasNamedProviderEcuTune = hasNamedProviderEcuTuneForVehicle({
    vehicle: vehicleForRules,
    definitions: candidateDefinitions,
  });
  const hasNamedProviderTurbo = hasNamedProviderTurboForVehicle({
    vehicle: vehicleForRules,
    definitions: candidateDefinitions,
  });
  const selectedDefinitions = selectDemoDefinitions({
    definitionsByCode,
    vehicle: vehicleForRules,
    hasNamedProviderEcuTune,
    hasNamedProviderTurbo,
  });
  const { definitions: safeSelectedDefinitions, rating: buildRating } =
    keepDemoRatingBelowMaximum({
      vehicleDefinition,
      selectedDefinitions,
    });

  if (!buildRating) {
    return null;
  }

  const overallDelta = ratingDelta(stockRating.overall, buildRating.overall);

  return {
    vehicleLabel: "Ford Focus RS Mk3",
    vehicleSubtitle: "2.3 EcoBoost",
    presentationLabel: "Track Build",
    sourceLabel: "Örnek ATS Build",
    stockRating,
    buildRating,
    overallDelta,
    formattedOverallDelta: formatRatingDelta(overallDelta),
    deltaRows: ratingComponentRows.map(([label, key]) => {
      const delta = ratingDelta(stockRating[key], buildRating[key]);

      return {
        label,
        key,
        stock: Math.round(stockRating[key]),
        build: Math.round(buildRating[key]),
        delta,
        formattedDelta: formatRatingDelta(delta),
        tone: ratingDeltaTone(delta),
      };
    }),
    parts: safeSelectedDefinitions.map((definition) => ({
      code: definition.code,
      label: formatModificationDefinition(definition),
      categoryLabel: modificationCategoryLabels[definition.category],
      fitmentLabel: fitmentLabelForDemoPart(definition, vehicleDefinition.id),
    })),
  };
}

async function getRatingDiscoveryCatalogShowcase(): Promise<RatingDiscoveryCatalogShowcase> {
  const [activeCategories, activeBrands] = await Promise.all([
    prisma.modificationDefinition.findMany({
      where: {
        active: true,
        category: {
          in: categoryChipOrder.map((chip) => chip.category),
        },
      },
      distinct: ["category"],
      select: {
        category: true,
      },
    }),
    prisma.modificationDefinition.findMany({
      where: {
        active: true,
        brand: {
          in: [...catalogBrandAllowlist],
        },
      },
      distinct: ["brand"],
      orderBy: {
        brand: "asc",
      },
      select: {
        brand: true,
      },
    }),
  ]);
  const activeCategorySet = new Set(
    activeCategories.map((item) => item.category),
  );
  const activeBrandSet = new Set(
    activeBrands.flatMap((item) => (item.brand ? [item.brand] : [])),
  );

  return {
    categoryChips: categoryChipOrder
      .filter((chip) => activeCategorySet.has(chip.category))
      .map((chip) => chip.label),
    brandChips: catalogBrandAllowlist.filter((brand) => activeBrandSet.has(brand)),
  };
}

function selectDemoDefinitions({
  definitionsByCode,
  vehicle,
  hasNamedProviderEcuTune,
  hasNamedProviderTurbo,
}: {
  definitionsByCode: Map<string, DemoModificationDefinition>;
  vehicle: VehicleBuildVehicle;
  hasNamedProviderEcuTune: boolean;
  hasNamedProviderTurbo: boolean;
}) {
  const selectedDefinitions: DemoModificationDefinition[] = [];

  for (const codeGroup of demoCandidateCodeGroups) {
    for (const code of codeGroup) {
      const definition = definitionsByCode.get(code);

      if (!definition) {
        continue;
      }

      const trialDefinitions = [...selectedDefinitions, definition];
      const availability = evaluateModificationBatchAvailability({
        vehicle,
        definitions: trialDefinitions,
        installedModifications: [],
        hasNamedProviderEcuTune,
        hasNamedProviderTurbo,
      });

      if (availability.ok) {
        selectedDefinitions.push(definition);
        break;
      }
    }
  }

  return selectedDefinitions;
}

function keepDemoRatingBelowMaximum({
  vehicleDefinition,
  selectedDefinitions,
}: {
  vehicleDefinition: DemoVehicleDefinition;
  selectedDefinitions: DemoModificationDefinition[];
}) {
  let definitions = [...selectedDefinitions];
  let rating = calculateVehiclePerformanceRating({
    vehicleDefinition,
    installedModifications: definitions.map(toRatingModificationInput),
  });

  while (rating && rating.overall >= 100 && definitions.length > 0) {
    definitions = definitions.slice(0, -1);
    rating = calculateVehiclePerformanceRating({
      vehicleDefinition,
      installedModifications: definitions.map(toRatingModificationInput),
    });
  }

  return {
    definitions,
    rating,
  };
}

function toVehicleBuildVehicle(
  vehicleDefinition: DemoVehicleDefinition,
): VehicleBuildVehicle {
  return {
    id: "rating-discovery-focus-rs-demo",
    userId: "rating-discovery-demo",
    vehicleDefinitionId: vehicleDefinition.id,
    vehicleDefinition: {
      powertrain: vehicleDefinition.powertrain,
      platformFamilyId: vehicleDefinition.platformFamilyId,
      engineFamilyId: vehicleDefinition.engineFamilyId,
    },
    brand: vehicleDefinition.brand,
    model: vehicleDefinition.model,
    year: vehicleDefinition.yearFrom,
    deletedAt: null,
  };
}

function toRatingModificationInput(
  definition: DemoModificationDefinition,
): VehicleRatingModificationInput {
  return {
    modificationDefinitionId: definition.id,
    modificationDefinition: definition,
  };
}

function fitmentLabelForDemoPart(
  definition: DemoModificationDefinition,
  vehicleDefinitionId: string,
) {
  const hasExactTemplateCompatibility = definition.compatibilities.some(
    (compatibility) => compatibility.vehicleDefinitionId === vehicleDefinitionId,
  );

  if (hasExactTemplateCompatibility) {
    return "Focus RS Mk3 katalog uyumu";
  }

  if (definition.compatibilities.length > 0) {
    return "Katalog uyumu doğrulanmış ürün ailesi";
  }

  return "Genel build profili kategorisi";
}
