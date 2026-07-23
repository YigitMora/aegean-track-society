import { tyreManufacturerLabel } from "@/lib/tyre-catalog";

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

export const legacyTyreModificationWarning =
  "Eski genel lastik kaydı. Daha doğru rating için belirli bir marka ve model seçin.";

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
  "tyre_performance_road_300tw_technical",
  "tyre_track_200tw_technical",
  "tyre_semi_slick_technical",
  "tyre_full_slick_technical",
  "tyre_wet_racing_technical",
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
  suspension_coilover_track_vehicle_specific: [
    {
      description:
        "Ölçülmüş geometri düzeltmesi, kaster ve bump-steer kontrolü önerilir.",
      optionCodes: [
        "suspension_caster_adjustment_vehicle_specific",
        "suspension_roll_center_correction_vehicle_specific",
        "suspension_bump_steer_correction_vehicle_specific",
      ],
    },
  ],
  suspension_coilover_three_way_competition_vehicle_specific: [
    {
      description:
        "Profesyonel geometri, mafsal ve alt şasi desteği önerilir.",
      optionCodes: [
        "suspension_roll_center_correction_vehicle_specific",
        "suspension_bump_steer_correction_vehicle_specific",
        "suspension_subframe_bushings_vehicle_specific",
        "suspension_spherical_bearings_vehicle_specific",
      ],
    },
  ],
  brakes_pads_track_day_vehicle_specific: [
    {
      description:
        "Yüksek sıcaklık fren hidroliği ve fren soğutma kanalları önerilir.",
      optionCodes: [
        "brakes_fluid_high_temperature_vehicle_specific",
        "brakes_cooling_ducts_vehicle_specific",
      ],
    },
  ],
  brakes_pads_endurance_vehicle_specific: [
    {
      description:
        "Yüksek sıcaklık fren hidroliği, iki parçalı disk ve fren soğutması önerilir.",
      optionCodes: [
        "brakes_fluid_high_temperature_vehicle_specific",
        "brakes_rotors_two_piece_vehicle_specific",
        "brakes_cooling_ducts_vehicle_specific",
      ],
    },
  ],
  brakes_big_brake_kit_vehicle_specific: [
    {
      description:
        "Uyumlu balata, yüksek sıcaklık hidroliği ve fren soğutması önerilir.",
      optionCodes: [
        "brakes_pads_track_day_vehicle_specific",
        "brakes_fluid_high_temperature_vehicle_specific",
        "brakes_cooling_ducts_vehicle_specific",
      ],
    },
  ],
  aero_functional_front_splitter_technical: [
    {
      description: "Ön/arka aero dengesi için işlevsel arka kanat önerilir.",
      optionCodes: ["aero_rear_wing_adjustable_technical"],
    },
  ],
  aero_rear_wing_adjustable_technical: [
    {
      description: "Ön/arka aero dengesi için işlevsel ön splitter önerilir.",
      optionCodes: ["aero_functional_front_splitter_technical"],
    },
  ],
  safety_harness_six_point_technical: [
    {
      description:
        "Uyumlu baş-boyun koruma sistemi ve yangın hazırlığı önerilir.",
      optionCodes: [
        "safety_hans_setup_technical",
        "safety_fire_extinguisher_vehicle_specific",
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

export function legacyModificationWarning(
  definition: ModificationCatalogNodeInput,
) {
  return definition.category === "TYRES"
    ? legacyTyreModificationWarning
    : legacyGenericModificationWarning;
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
  definition: Pick<ModificationCatalogNodeInput, "brand" | "category">,
) {
  if (definition.category === "TYRES") {
    return tyreManufacturerLabel(definition);
  }

  const brand = definition.brand?.trim();

  return brand &&
    brand !== "Generic" &&
    brand !== "Technical Configuration"
    ? brand
    : "Teknik konfigürasyon";
}
