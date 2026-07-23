type WheelCatalogDefinition = {
  name?: string | null;
  variant?: string | null;
};

export function wheelProductModelLabel(definition: WheelCatalogDefinition) {
  const variant = definition.variant?.trim();

  if (variant) {
    return variant;
  }

  return definition.name?.trim() || "Jant modeli";
}
