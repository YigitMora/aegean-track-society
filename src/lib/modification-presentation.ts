import { createHash } from "node:crypto";
import type { ModificationCategory } from "@prisma/client";

const modificationTypeLabels: Record<string, string> = {
  brake_pad: "Fren Balatası",
  brake_fluid: "Fren Hidroliği",
  braided_brake_line: "Çelik Fren Hortumu",
  brake_disc: "Fren Diski",
  caliper: "Kaliper",
  big_brake_kit: "Big Brake Kit",
  brake_cooling: "Fren Soğutma",
  ecu_unlock: "ECU Kilit Açma",
  ecu_software: "ECU Yazılımı",
  platform_tune_package: "Platform Tune Paketi",
  transmission_software: "Şanzıman Yazılımı",
  flex_fuel_hardware: "Flex Fuel Donanımı",
  ethanol_fuel_configuration: "Etanol Yakıt Yapılandırması",
  fuel_pump_high_pressure: "Yüksek Basınç Yakıt Pompası",
  fuel_pump_low_pressure: "Düşük Basınç Yakıt Pompası",
  fuel_injector: "Yakıt Enjektörü",
  flex_fuel_sensor: "Flex Fuel Sensörü",
  ethanol_content_sensor: "Etanol İçerik Sensörü",
  auxiliary_fueling: "Yardımcı Yakıt Sistemi",
  fuel_surge_protection: "Yakıt Dalgalanma Koruması",
  spark_plug: "Buji",
  ignition_coil: "Ateşleme Bobini",
  spark_plug_gap: "Buji Aralığı Ayarı",
  air_filter: "Hava Filtresi",
  intake: "Emiş",
  intake_pipe: "Emiş Borusu",
  ram_air_duct: "Ram-Air Kanalı",
  turbo_inlet: "Turbo Inlet",
  charge_pipe: "Charge Pipe",
  downpipe: "Downpipe",
  sports_catalyst: "Spor Katalizör",
  cat_back_exhaust: "Cat-back Egzoz",
  axle_back_exhaust: "Axle-back Egzoz",
  exhaust_manifold: "Egzoz Manifoldu",
  exhaust_valve_controller: "Egzoz Valf Kontrolü",
  turbo_upgrade: "Turbocharger Upgrade",
  hybrid_turbo: "Hybrid Turbo",
  big_turbo: "Big Turbo",
  turbocharger_upgrade: "Turbocharger Upgrade",
  twin_turbo_upgrade: "Twin Turbo Upgrade",
  supercharger_upgrade: "Supercharger Upgrade",
  wastegate: "Wastegate",
  boost_control: "Boost Kontrol Donanımı",
  methanol_injection: "Su-Metanol Enjeksiyonu",
  intercooler: "Intercooler",
  oil_cooler: "Yağ Soğutucu",
  radiator: "Radyatör",
  auxiliary_radiator: "Yardımcı Radyatör",
  transmission_cooler: "Şanzıman Soğutucu",
  differential_cooler: "Diferansiyel Soğutucu",
  heat_exchanger: "Isı Eşanjörü",
  thermostat: "Termostat",
  sport_springs: "Spor Yay",
  coilover: "Coilover",
  damper: "Amortisör",
  camber_hardware: "Kamber Donanımı",
  camber_plate: "Kamber Plakası",
  adjustable_ball_joint: "Ayarlı Rotil",
  adjustable_control_arm: "Ayarlı Kontrol Kolu",
  anti_roll_bar: "Anti-roll Bar",
  anti_roll_bar_front: "Ön Anti-roll Bar",
  anti_roll_bar_rear: "Arka Anti-roll Bar",
  bushings: "Burç",
  strut_brace: "Kule Gergisi",
  chassis_brace: "Şasi Gergisi",
  tyre_touring: "Touring Lastik",
  tyre_uhp_road: "UHP Yol Lastiği",
  tyre_max_performance_road: "Max Performance Lastik",
  tyre_extreme_performance: "Extreme Performance Lastik",
  tyre_trackday: "Trackday Lastiği",
  tyre_semi_slick: "Semi-slick",
  tyre_slick: "Slick",
  tyre_wet_racing: "Yağmur Yarış Lastiği",
  wheel: "Jant",
  lightweight_wheel: "Hafif Jant",
  forged_wheel: "Dövme Jant",
  wheels: "Jant",
  front_splitter: "Ön Splitter",
  rear_diffuser: "Arka Difüzör",
  rear_wing: "Arka Kanat",
  aero_kit: "Aero Kit",
  lsd: "LSD",
  electronic_lsd_calibration: "Elektronik Diferansiyel Kalibrasyonu",
  final_drive: "Son Dişli Oranı",
  driveshaft: "Tahrik Şaftı",
  engine_mount: "Motor Kulağı",
  transmission_mount: "Şanzıman Kulağı",
  differential_mount: "Diferansiyel Kulağı",
  dogbone_mount: "Dogbone Mount",
  clutch: "Debriyaj",
  flywheel: "Volan",
  driveshaft_axle: "Aks / Şaft",
  roll_bar: "Roll Bar",
  fire_extinguisher: "Yangın Söndürücü",
};

type ModificationTypeDefinition = {
  category: ModificationCategory;
  componentTypeCode?: string | null;
  name: string;
};

const mobileCatalogKeyNamespace = "ats-mobile-build-v1";

export function modificationTypeLabel(
  definition: Pick<ModificationTypeDefinition, "componentTypeCode" | "name">,
) {
  return definition.componentTypeCode
    ? modificationTypeLabels[definition.componentTypeCode] ?? definition.name
    : definition.name;
}

export function modificationTypeGroup(definition: ModificationTypeDefinition) {
  const typeKey =
    definition.componentTypeCode ?? definition.name.toLocaleLowerCase("tr-TR");

  return {
    key: opaqueMobileCatalogKey("group", `${definition.category}:${typeKey}`),
    label: modificationTypeLabel(definition),
  };
}

export function modificationSelectionGroupKey(
  definition: Pick<ModificationTypeDefinition, "category">,
  slotKey: string | null,
) {
  return slotKey
    ? opaqueMobileCatalogKey("slot", `${definition.category}:${slotKey}`)
    : null;
}

function opaqueMobileCatalogKey(kind: "group" | "slot", value: string) {
  const digest = createHash("sha256")
    .update(`${mobileCatalogKeyNamespace}:${kind}:${value}`)
    .digest("base64url")
    .slice(0, 16);

  return `${kind}_${digest}`;
}
