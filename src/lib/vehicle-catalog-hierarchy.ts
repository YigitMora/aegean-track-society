export type VehicleCatalogDefinitionInput = {
  id: string;
  code: string;
  brand: string;
  model: string;
  generation: string | null;
  chassisCode: string | null;
  variant: string | null;
  engineFamily?: {
    name: string;
  } | null;
};

export type VehicleCatalogVariant = {
  vehicleDefinitionId: string;
  code: string;
  label: string;
};

export type VehicleCatalogGeneration = {
  name: string;
  variants: VehicleCatalogVariant[];
};

export type VehicleCatalogModel = {
  name: string;
  generations: VehicleCatalogGeneration[];
};

export type VehicleCatalogBrand = {
  name: string;
  models: VehicleCatalogModel[];
};

export type VehicleCatalogHierarchy = {
  brands: VehicleCatalogBrand[];
  definitionCount: number;
};

export type VehicleCatalogPath = {
  brand: string;
  modelFamily: string;
  generation: string;
  variant: VehicleCatalogVariant;
};

const naturalCollator = new Intl.Collator("tr-TR", {
  numeric: true,
  sensitivity: "base",
});

const modelFamilyOverrides = new Map<string, string>([
  [overrideKey("BMW", "1M Coupe"), "1M"],
  [overrideKey("Audi", "A3 35 TFSI"), "A3"],
  [overrideKey("Audi", "R8 V10 Performance"), "R8"],
  [overrideKey("Fiat", "500e"), "500"],
  [overrideKey("Mazda", "Mazda3 Turbo"), "Mazda3"],
]);

export function buildVehicleCatalogHierarchy(
  definitions: readonly VehicleCatalogDefinitionInput[],
): VehicleCatalogHierarchy {
  const brands = new Map<
    string,
    Map<string, Map<string, VehicleCatalogVariant[]>>
  >();

  for (const definition of definitions) {
    const modelFamily = catalogModelFamily(definition);
    const generation = catalogGenerationName(definition);
    const variant = {
      vehicleDefinitionId: definition.id,
      code: definition.code,
      label: catalogVariantLabel(definition, modelFamily),
    };
    const models = getOrCreate(brands, definition.brand, () => new Map());
    const generations = getOrCreate(models, modelFamily, () => new Map());
    const variants = getOrCreate(
      generations,
      generation,
      () => [] as VehicleCatalogVariant[],
    );

    variants.push(variant);
  }

  return {
    brands: Array.from(brands, ([name, models]) => ({
      name,
      models: Array.from(models, ([modelName, generations]) => ({
        name: modelName,
        generations: Array.from(generations, ([generationName, variants]) => ({
          name: generationName,
          variants: variants.sort((left, right) =>
            compareCatalogText(left.label, right.label) ||
            compareCatalogText(left.code, right.code),
          ),
        })).sort((left, right) => compareCatalogText(left.name, right.name)),
      })).sort((left, right) => compareCatalogText(left.name, right.name)),
    })).sort((left, right) => compareCatalogText(left.name, right.name)),
    definitionCount: definitions.length,
  };
}

export function findVehicleCatalogPath(
  hierarchy: VehicleCatalogHierarchy,
  vehicleDefinitionId: string | null | undefined,
): VehicleCatalogPath | null {
  if (!vehicleDefinitionId) {
    return null;
  }

  for (const brand of hierarchy.brands) {
    for (const model of brand.models) {
      for (const generation of model.generations) {
        const variant = generation.variants.find(
          (candidate) => candidate.vehicleDefinitionId === vehicleDefinitionId,
        );

        if (variant) {
          return {
            brand: brand.name,
            modelFamily: model.name,
            generation: generation.name,
            variant,
          };
        }
      }
    }
  }

  return null;
}

export function searchVehicleCatalogDefinitions(
  definitions: readonly VehicleCatalogDefinitionInput[],
  query: string,
) {
  const normalizedQuery = normalizeLookup(query);

  if (!normalizedQuery) {
    return [];
  }

  return definitions
    .filter((definition) =>
      catalogSearchText(definition).includes(normalizedQuery),
    )
    .sort((left, right) => {
      const leftFamily = catalogModelFamily(left);
      const rightFamily = catalogModelFamily(right);

      return (
        compareCatalogText(left.brand, right.brand) ||
        compareCatalogText(leftFamily, rightFamily) ||
        compareCatalogText(
          catalogGenerationName(left),
          catalogGenerationName(right),
        ) ||
        compareCatalogText(
          catalogVariantLabel(left, leftFamily),
          catalogVariantLabel(right, rightFamily),
        ) ||
        compareCatalogText(left.code, right.code)
      );
    });
}

export function catalogModelFamily(
  definition: Pick<VehicleCatalogDefinitionInput, "brand" | "model">,
) {
  const overridden = modelFamilyOverrides.get(
    overrideKey(definition.brand, definition.model),
  );

  if (overridden) {
    return overridden;
  }

  const resolver = modelFamilyResolvers[definition.brand];
  return resolver?.(definition.model) ?? definition.model.trim();
}

export function catalogGenerationName(
  definition: Pick<
    VehicleCatalogDefinitionInput,
    "brand" | "model" | "generation" | "chassisCode"
  >,
) {
  if (definition.brand === "Fiat" && definition.model.startsWith("Egea ")) {
    return definition.model.slice("Egea ".length).trim();
  }

  const generation = definition.generation?.trim() || null;
  const chassis = definition.chassisCode?.trim() || null;

  if (!generation && !chassis) {
    return "Tek nesil";
  }

  if (!generation) {
    return chassis as string;
  }

  if (!chassis || compactIdentity(generation) === compactIdentity(chassis)) {
    return generation;
  }

  if (
    compactIdentity(generation).includes(compactIdentity(chassis)) ||
    compactIdentity(chassis).includes(compactIdentity(generation))
  ) {
    return generation.length >= chassis.length ? generation : chassis;
  }

  return `${generation} / ${chassis}`;
}

export function catalogVariantLabel(
  definition: Pick<
    VehicleCatalogDefinitionInput,
    "brand" | "model" | "variant"
  >,
  modelFamily = catalogModelFamily(definition),
) {
  const rawModel = displayModelName(definition.brand, definition.model);
  const variant = definition.variant?.trim() || null;
  const qualifier = modelQualifier(definition.brand, rawModel, modelFamily);

  if (
    qualifier &&
    variant &&
    !compactIdentity(qualifier).includes(compactIdentity(variant))
  ) {
    return `${qualifier} - ${variant}`;
  }

  return qualifier || variant || rawModel || "Standart";
}

export function compareCatalogText(left: string, right: string) {
  return naturalCollator.compare(left, right);
}

function catalogSearchText(definition: VehicleCatalogDefinitionInput) {
  const modelFamily = catalogModelFamily(definition);

  return normalizeLookup(
    [
      definition.brand,
      modelFamily,
      definition.model,
      catalogGenerationName(definition),
      definition.generation,
      definition.chassisCode,
      definition.variant,
      catalogVariantLabel(definition, modelFamily),
      definition.engineFamily?.name,
      definition.code,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function modelQualifier(brand: string, rawModel: string, modelFamily: string) {
  if (brand === "Fiat" && rawModel.startsWith("Egea ")) {
    return null;
  }

  const rawIdentity = compactIdentity(rawModel);
  const familyIdentity = compactIdentity(modelFamily);

  if (rawIdentity === familyIdentity) {
    return shouldRepeatFamilyAtVariantLevel(brand, modelFamily)
      ? modelFamily
      : null;
  }

  if (normalizeLookup(rawModel).startsWith(`${normalizeLookup(modelFamily)} `)) {
    return rawModel.slice(modelFamily.length).trim() || null;
  }

  return rawModel;
}

function shouldRepeatFamilyAtVariantLevel(brand: string, modelFamily: string) {
  return (
    (brand === "BMW" && /^(?:1M|M[2-8])$/.test(modelFamily)) ||
    (brand === "Audi" && /^(?:RS|S|SQ)\d/.test(modelFamily))
  );
}

function displayModelName(brand: string, model: string) {
  if (brand !== "Mercedes-Benz") {
    return model.trim();
  }

  return model.trim().replace(/^([A-Z]{1,3})\s+(\d)/, "$1$2");
}

const modelFamilyResolvers: Record<string, (model: string) => string> = {
  BMW: (model) => {
    const trimmed = model.trim();
    const mModel = /^M([2-8])(?:\s|$)/.exec(trimmed);
    if (mModel) {
      return `M${mModel[1]}`;
    }

    const numberedSeries = /^M?([1-8])\d{2}/.exec(trimmed);
    if (numberedSeries) {
      return `${numberedSeries[1]} Serisi`;
    }

    return (
      /^X\d/.exec(trimmed)?.[0] ??
      /^Z\d/.exec(trimmed)?.[0] ??
      /^i\d/.exec(trimmed)?.[0] ??
      trimmed
    );
  },
  Volkswagen: (model) => firstMatchingFamily(model, ["Golf", "Polo"]),
  Audi: (model) => {
    const trimmed = model.trim();
    const performanceFamily = /^(RS|S|SQ)\s?([1-8])(?:\s|$)/.exec(trimmed);
    if (performanceFamily) {
      return `${performanceFamily[1]}${performanceFamily[2]}`;
    }

    return /^(A[1-8]|Q[2-8]|R8)(?:\s|$)/.exec(trimmed)?.[1] ?? trimmed;
  },
  "Mercedes-Benz": (model) => {
    const trimmed = model.trim();
    if (trimmed.startsWith("AMG GT")) {
      return "AMG GT";
    }

    const classFamily = /^([ABCEGS])\s+\d/.exec(trimmed);
    if (classFamily) {
      return `${classFamily[1]}-Serisi`;
    }

    return firstMatchingFamily(trimmed, [
      "CLA",
      "GLA",
      "GLB",
      "GLC",
      "GLE",
      "GLS",
      "EQA",
      "EQB",
      "EQC",
      "EQE",
      "EQS",
      "SLK",
      "SLC",
      "SL",
    ]);
  },
  Fiat: (model) => model.startsWith("Egea ") ? "Egea" : model.trim(),
  Abarth: (model) => firstMatchingFamily(model, ["124", "595", "695"]),
  Honda: (model) => firstMatchingFamily(model, ["Civic", "Integra", "S2000"]),
  Hyundai: (model) => firstMatchingFamily(model, [
    "Ioniq 5",
    "Kona",
    "Elantra",
    "i10",
    "i20",
    "i30",
  ]),
  Porsche: (model) => firstMatchingFamily(model, ["911", "718", "Taycan"]),
  Ferrari: (model) => firstMatchingFamily(model, ["458", "488", "812"]),
  "Alfa Romeo": (model) => firstMatchingFamily(model, [
    "Giulietta",
    "Stelvio",
    "Giulia",
    "MiTo",
    "Tonale",
    "147",
    "156",
    "4C",
  ]),
  Renault: (model) => firstMatchingFamily(model, ["Megane", "Clio", "Captur"]),
  Peugeot: (model) => {
    const electricFamily = /^e-(208|2008)$/.exec(model.trim());
    return (
      electricFamily?.[1] ??
      firstMatchingFamily(model, ["308", "208", "2008"])
    );
  },
  Ford: (model) => firstMatchingFamily(model, [
    "Transit Courier",
    "Tourneo Courier",
    "Mustang",
    "Fiesta",
    "Focus",
    "Kuga",
    "Puma",
  ]),
  Nissan: (model) =>
    /^(?:350Z|370Z|Z Performance)$/.test(model.trim()) ? "Z" : model.trim(),
};

function firstMatchingFamily(model: string, families: readonly string[]) {
  const trimmed = model.trim();
  return families.find((family) =>
    trimmed === family || trimmed.startsWith(`${family} `),
  ) ?? trimmed;
}

function getOrCreate<TKey, TValue>(
  map: Map<TKey, TValue>,
  key: TKey,
  create: () => TValue,
) {
  const existing = map.get(key);
  if (existing !== undefined) {
    return existing;
  }

  const value = create();
  map.set(key, value);
  return value;
}

function overrideKey(brand: string, model: string) {
  return `${brand}\u0000${model}`;
}

function normalizeLookup(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactIdentity(value: string) {
  return normalizeLookup(value).replace(/\s+/g, "");
}
