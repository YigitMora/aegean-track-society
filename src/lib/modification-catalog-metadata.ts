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

export type ModificationRecommendationGroup = {
  description: string;
  optionCodes: readonly string[];
};

const modificationRecommendationGroupsByCode: Readonly<
  Record<string, readonly ModificationRecommendationGroup[]>
> = {
  rsa_bmw_b48_g20_280: [
    {
      description: "Tekrarlı yük için yükseltilmiş şarj havası soğutması önerilir.",
      optionCodes: ["cooling_charge_air_cooler_vehicle_specific"],
    },
  ],
  engine_rsa300: [
    {
      description:
        "Tekrarlı yüksek yük için şarj havası ve motor yağı soğutması önerilir.",
      optionCodes: [
        "cooling_charge_air_cooler_vehicle_specific",
        "cooling_engine_oil_thermostatic_vehicle_specific",
      ],
    },
  ],
  rsa_bmw_b48_g20_320_e25: [
    {
      description: "Tekrarlı yük ve pist kullanımı için destek parçaları önerilir.",
      optionCodes: [
        "cooling_charge_air_cooler_vehicle_specific",
        "cooling_engine_oil_thermostatic_vehicle_specific",
        "ignition_colder_spark_plugs_vehicle_specific",
        "charge_pipe_reinforced_vehicle_specific",
      ],
    },
  ],
  ecu_b48_g20_custom_dyno_hybrid_turbo: [
    {
      description:
        "Ölçülmüş yakıt, ateşleme, yağ soğutma ve şanzıman desteği önerilir.",
      optionCodes: [
        "fuel_lpfp_upgrade_vehicle_specific",
        "fuel_ethanol_content_sensor_vehicle_specific",
        "ignition_colder_spark_plugs_vehicle_specific",
        "ignition_coils_upgrade_vehicle_specific",
        "cooling_engine_oil_thermostatic_vehicle_specific",
        "tune_xhp_bmw_zf8_stage_3",
      ],
    },
  ],
  turbo_b48_g20_hybrid_vehicle_specific: [
    {
      description:
        "Yakıt, şarj havası, ateşleme ve aktarma sistemi desteği önerilir.",
      optionCodes: [
        "fuel_hpfp_upgrade_vehicle_specific",
        "fuel_lpfp_upgrade_vehicle_specific",
        "cooling_charge_air_cooler_vehicle_specific",
        "ignition_colder_spark_plugs_vehicle_specific",
        "charge_pipe_reinforced_vehicle_specific",
        "tune_xhp_bmw_zf8_stage_3",
      ],
    },
  ],
};

export function modificationRecommendationGroups(code: string | null | undefined) {
  return code ? modificationRecommendationGroupsByCode[code] ?? [] : [];
}

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
