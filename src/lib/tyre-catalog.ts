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
  category?: string | null;
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
