export const visibleTyreClasses = [
  {
    key: "ROAD",
    label: "Yol Lastiği",
    badgeLabel: "Yol",
  },
  {
    key: "SEMI_SLICK",
    label: "Semi-Slick",
    badgeLabel: "Semi-Slick",
  },
  {
    key: "SLICK",
    label: "Slick",
    badgeLabel: "Slick",
  },
] as const;

export type VisibleTyreClassKey = (typeof visibleTyreClasses)[number]["key"];

type TyreCatalogDefinition = {
  code?: string | null;
  category?: string | null;
  brand?: string | null;
  name?: string | null;
  variant?: string | null;
  componentTypeCode?: string | null;
  tyreSpecification?: {
    tyreClass: string;
    roadLegal?: boolean | null;
  } | null;
};

const visibleClassByTechnicalClass: Record<string, VisibleTyreClassKey> = {
  TOURING: "ROAD",
  UHP_ROAD: "ROAD",
  MAX_PERFORMANCE_ROAD: "ROAD",
  EXTREME_PERFORMANCE: "SEMI_SLICK",
  TRACKDAY: "SEMI_SLICK",
  SEMI_SLICK: "SEMI_SLICK",
  SLICK: "SLICK",
  WET_RACING: "SLICK",
};

const visibleClassByComponentType: Record<string, VisibleTyreClassKey> = {
  tyre_touring: "ROAD",
  tyre_uhp_road: "ROAD",
  tyre_max_performance_road: "ROAD",
  tyre_extreme_performance: "SEMI_SLICK",
  tyre_trackday: "SEMI_SLICK",
  tyre_semi_slick: "SEMI_SLICK",
  tyre_slick: "SLICK",
  tyre_wet_racing: "SLICK",
};

const treadwearByCode: Record<string, number> = {
  tyre_yokohama_advan_a052: 200,
  tyre_bridgestone_potenza_re_71r: 200,
  tyre_bridgestone_potenza_re_71rs: 200,
  tyre_yokohama_advan_neova_ad09: 200,
  tyre_falken_azenis_rt660: 200,
  tyre_hankook_ventus_rs4_z232: 200,
  tyre_kumho_ecsta_v730: 200,
  tyre_maxxis_victra_rc_1: 100,
  tyre_maxxis_victra_vr_1: 200,
  tyre_maxxis_victra_sport_vr2: 200,
  tyre_bfgoodrich_g_force_rival_s_1_5: 200,
  tyre_continental_extremecontact_force: 200,
  tyre_goodyear_eagle_f1_supercar_3r: 100,
};

export const tyreComponentTypeCodes = new Set(
  Object.keys(visibleClassByComponentType),
);

export function visibleTyreClassForDefinition(
  definition: TyreCatalogDefinition,
) {
  if (definition.category !== "TYRES") {
    return null;
  }

  const technicalClass = definition.tyreSpecification?.tyreClass;

  if (technicalClass && visibleClassByTechnicalClass[technicalClass]) {
    return visibleClassByTechnicalClass[technicalClass];
  }

  const componentTypeCode = definition.componentTypeCode;

  return componentTypeCode
    ? visibleClassByComponentType[componentTypeCode] ?? null
    : null;
}

export function visibleTyreClassLabel(
  tyreClass: VisibleTyreClassKey | null | undefined,
) {
  return (
    visibleTyreClasses.find((candidate) => candidate.key === tyreClass)?.label ??
    null
  );
}

export function visibleTyreClassBadgeLabel(
  tyreClass: VisibleTyreClassKey | null | undefined,
) {
  return (
    visibleTyreClasses.find((candidate) => candidate.key === tyreClass)
      ?.badgeLabel ?? null
  );
}

export function tyreSurfaceIntentLabel(definition: TyreCatalogDefinition) {
  const technicalClass = definition.tyreSpecification?.tyreClass;

  if (technicalClass === "WET_RACING") {
    return "Islak";
  }

  if (technicalClass === "SLICK") {
    return "Kuru";
  }

  return visibleTyreClassForDefinition(definition) === "ROAD"
    ? "Kuru / ıslak"
    : "Kuru";
}

export function tyreRoadUseLabel(definition: TyreCatalogDefinition) {
  const roadLegal = definition.tyreSpecification?.roadLegal;

  if (roadLegal === true) {
    return "Yol kullanımına uygun";
  }

  if (roadLegal === false) {
    return "Yalnızca pist";
  }

  return "Yasal durum doğrulanmalı";
}

export function tyreManufacturerLabel(definition: TyreCatalogDefinition) {
  const brand = definition.brand?.trim();

  if (!brand || brand === "Generic" || brand === "Technical Configuration") {
    return "Teknik konfigürasyon";
  }

  return brand.replace(/ Motorsport$/, "");
}

export function tyreProductModelLabel(definition: TyreCatalogDefinition) {
  return definition.variant?.trim() || definition.name?.trim() || "Lastik";
}

export function tyreTreadwearLabel(definition: TyreCatalogDefinition) {
  const treadwear = definition.code
    ? treadwearByCode[definition.code]
    : undefined;

  return treadwear ? `TW ${treadwear}` : null;
}
