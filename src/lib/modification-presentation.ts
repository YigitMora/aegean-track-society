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
  ecu_software: "ECU Yazılımı",
  platform_tune_package: "Platform Tune Paketi",
  transmission_software: "Şanzıman Yazılımı",
  flex_fuel_hardware: "Flex Fuel Donanımı",
  air_filter: "Hava Filtresi",
  intake: "Emiş",
  turbo_inlet: "Turbo Inlet",
  charge_pipe: "Charge Pipe",
  downpipe: "Downpipe",
  cat_back_exhaust: "Cat-back Egzoz",
  axle_back_exhaust: "Axle-back Egzoz",
  exhaust_manifold: "Egzoz Manifoldu",
  turbo_upgrade: "Turbocharger Upgrade",
  hybrid_turbo: "Hybrid Turbo",
  big_turbo: "Big Turbo",
  turbocharger_upgrade: "Turbocharger Upgrade",
  twin_turbo_upgrade: "Twin Turbo Upgrade",
  supercharger_upgrade: "Supercharger Upgrade",
  intercooler: "Intercooler",
  oil_cooler: "Yağ Soğutucu",
  radiator: "Radyatör",
  transmission_cooler: "Şanzıman Soğutucu",
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
