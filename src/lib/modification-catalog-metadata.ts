export type ModificationCatalogNodeInput = {
  active?: boolean;
  code?: string | null;
  category?: string | null;
  brand?: string | null;
  name?: string | null;
  variant?: string | null;
  componentTypeCode?: string | null;
};

export const legacyGenericModificationWarning =
  "Eski genel modifikasyon kaydı. Daha doğru rating için belirli bir ürün seçin.";

export const concreteModificationRequiredMessage =
  "Yalnızca belirli bir ürün veya modifikasyon versiyonu seçilebilir.";

export const legacyGenericModificationCodes = new Set([
  "suspension_sport_springs_generic",
  "suspension_adjustable_front_camber_hardware",
  "suspension_rear_anti_roll_bar",
  "suspension_front_anti_roll_bar",
  "suspension_performance_damper",
  "suspension_camber_plate",
  "suspension_adjustable_ball_joint",
  "suspension_adjustable_control_arm",
  "suspension_strut_brace",
  "brakes_performance_pads",
  "brakes_track_pads",
  "brakes_braided_lines",
  "brakes_high_temperature_fluid",
  "brakes_big_brake_kit",
  "brakes_cooling_ducts",
  "brakes_brake_disc",
  "brakes_two_piece_brake_disc",
  "ecu_stage_1",
  "ecu_stage_2",
  "cooling_intercooler_upgrade",
  "cooling_oil_cooler",
  "intake_exhaust_intake",
  "intake_exhaust_high_flow_downpipe",
  "engine_flex_fuel",
  "engine_turbo_upgrade",
  "engine_hybrid_turbo_generic",
  "engine_big_turbo_generic",
  "tyres_uhp_road",
  "tyres_semi_slick",
  "tyres_slick",
  "wheels_lightweight",
  "drivetrain_aftermarket_lsd",
  "drivetrain_transmission_software",
  "drivetrain_performance_clutch",
  "drivetrain_lightweight_flywheel",
  "safety_bucket_seat",
  "safety_fixed_back_seat",
  "safety_harness",
  "safety_roll_bar",
  "safety_half_cage",
  "safety_full_roll_cage",
  "safety_fire_extinguisher",
]);

export function isLegacyGenericModificationDefinition(
  definition: ModificationCatalogNodeInput,
) {
  return Boolean(
    definition.code && legacyGenericModificationCodes.has(definition.code),
  );
}

export function isConcreteModificationLeaf(
  definition: ModificationCatalogNodeInput,
) {
  return Boolean(
    definition.code?.trim() &&
      definition.category &&
      definition.name?.trim() &&
      definition.componentTypeCode?.trim() &&
      !isLegacyGenericModificationDefinition(definition),
  );
}

export function isSelectableModificationLeaf(
  definition: ModificationCatalogNodeInput,
) {
  return definition.active !== false && isConcreteModificationLeaf(definition);
}

export function modificationManufacturerLabel(
  definition: Pick<ModificationCatalogNodeInput, "brand">,
) {
  const brand = definition.brand?.trim();

  return brand && brand !== "Generic" ? brand : "Teknik konfigürasyon";
}
