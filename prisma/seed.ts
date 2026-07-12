import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const eventSlug = "kula-mytrack-2026";
const sep20 = new Date("2026-09-20T00:00:00.000Z");
const modificationCatalog = [
  {
    code: "suspension_sport_springs_generic",
    category: "SUSPENSION",
    brand: "Generic",
    name: "Sport Springs",
    sortOrder: 10,
  },
  {
    code: "suspension_coilover_jom",
    category: "SUSPENSION",
    brand: "JOM",
    name: "Coilover",
    sortOrder: 20,
  },
  {
    code: "suspension_coilover_st_x",
    category: "SUSPENSION",
    brand: "ST",
    name: "Coilover",
    variant: "X",
    sortOrder: 30,
  },
  {
    code: "suspension_coilover_st_xa",
    category: "SUSPENSION",
    brand: "ST",
    name: "Coilover",
    variant: "XA",
    sortOrder: 40,
  },
  {
    code: "suspension_coilover_kw_v1",
    category: "SUSPENSION",
    brand: "KW",
    name: "Coilover",
    variant: "V1",
    sortOrder: 50,
  },
  {
    code: "suspension_coilover_kw_v3",
    category: "SUSPENSION",
    brand: "KW",
    name: "Coilover",
    variant: "V3",
    sortOrder: 60,
  },
  {
    code: "suspension_coilover_kw_clubsport",
    category: "SUSPENSION",
    brand: "KW",
    name: "Coilover",
    variant: "Clubsport",
    sortOrder: 70,
  },
  {
    code: "suspension_coilover_ohlins_road_track",
    category: "SUSPENSION",
    brand: "Ohlins",
    name: "Coilover",
    variant: "Road & Track",
    sortOrder: 80,
  },
  {
    code: "suspension_coilover_nitron_ntr_r1",
    category: "SUSPENSION",
    brand: "Nitron",
    name: "Coilover",
    variant: "NTR R1",
    sortOrder: 90,
  },
  {
    code: "suspension_coilover_nitron_ntr_r3",
    category: "SUSPENSION",
    brand: "Nitron",
    name: "Coilover",
    variant: "NTR R3",
    sortOrder: 100,
  },
  {
    code: "suspension_adjustable_front_camber_hardware",
    category: "SUSPENSION",
    name: "Adjustable front camber hardware",
    sortOrder: 110,
  },
  {
    code: "suspension_rear_anti_roll_bar",
    category: "SUSPENSION",
    name: "Rear anti-roll bar",
    sortOrder: 120,
  },
  {
    code: "brakes_performance_pads",
    category: "BRAKES",
    name: "Performance brake pads",
    sortOrder: 10,
  },
  {
    code: "brakes_track_pads",
    category: "BRAKES",
    name: "Track brake pads",
    sortOrder: 20,
  },
  {
    code: "brakes_braided_lines",
    category: "BRAKES",
    name: "Braided brake lines",
    sortOrder: 30,
  },
  {
    code: "brakes_high_temperature_fluid",
    category: "BRAKES",
    name: "High-temperature brake fluid",
    sortOrder: 40,
  },
  {
    code: "brakes_big_brake_kit",
    category: "BRAKES",
    name: "Big Brake Kit",
    sortOrder: 50,
  },
  {
    code: "brakes_cooling_ducts",
    category: "BRAKES",
    name: "Brake cooling ducts",
    sortOrder: 60,
  },
  {
    code: "ecu_stage_1",
    category: "ECU",
    name: "ECU Stage 1",
    sortOrder: 10,
  },
  {
    code: "ecu_stage_2",
    category: "ECU",
    name: "ECU Stage 2",
    sortOrder: 20,
  },
  {
    code: "engine_rsa300",
    category: "ENGINE",
    name: "RSA300",
    sortOrder: 10,
  },
  {
    code: "cooling_intercooler_upgrade",
    category: "COOLING",
    name: "Intercooler upgrade",
    sortOrder: 10,
  },
  {
    code: "cooling_oil_cooler",
    category: "COOLING",
    name: "Oil cooler",
    sortOrder: 20,
  },
  {
    code: "intake_exhaust_intake",
    category: "INTAKE_EXHAUST",
    name: "Intake",
    sortOrder: 10,
  },
  {
    code: "intake_exhaust_high_flow_downpipe",
    category: "INTAKE_EXHAUST",
    name: "High-flow downpipe",
    sortOrder: 20,
  },
  {
    code: "engine_flex_fuel",
    category: "ENGINE",
    name: "Flex fuel",
    sortOrder: 20,
  },
  {
    code: "engine_turbo_upgrade",
    category: "ENGINE",
    name: "Turbo upgrade",
    sortOrder: 30,
  },
  {
    code: "tyres_uhp_road",
    category: "TYRES",
    name: "UHP road tyres",
    sortOrder: 10,
  },
  {
    code: "tyres_semi_slick",
    category: "TYRES",
    name: "Semi-slick tyres",
    sortOrder: 20,
  },
  {
    code: "tyres_slick",
    category: "TYRES",
    name: "Slick tyres",
    sortOrder: 30,
  },
  {
    code: "wheels_lightweight",
    category: "WHEELS",
    name: "Lightweight wheels",
    sortOrder: 10,
  },
  {
    code: "drivetrain_aftermarket_lsd",
    category: "DRIVETRAIN",
    name: "Aftermarket LSD",
    sortOrder: 10,
  },
  {
    code: "drivetrain_transmission_software",
    category: "DRIVETRAIN",
    name: "Transmission software",
    sortOrder: 20,
  },
  {
    code: "safety_bucket_seat",
    category: "SAFETY",
    name: "Bucket seat",
    sortOrder: 10,
  },
  {
    code: "safety_harness",
    category: "SAFETY",
    name: "Harness",
    sortOrder: 20,
  },
  {
    code: "safety_half_cage",
    category: "SAFETY",
    name: "Half cage",
    sortOrder: 30,
  },
  {
    code: "safety_full_roll_cage",
    category: "SAFETY",
    name: "Full roll cage",
    sortOrder: 40,
  },
] as const;

const coiloverCodes = modificationCatalog
  .filter((item) => item.name === "Coilover")
  .map((item) => item.code);

const modificationConflictCodePairs = [
  ...coiloverCodes.map((coiloverCode) => [
    "suspension_sport_springs_generic",
    coiloverCode,
  ] as const),
  ...pairwise(coiloverCodes),
  ["brakes_performance_pads", "brakes_track_pads"],
  ["tyres_uhp_road", "tyres_semi_slick"],
  ["tyres_uhp_road", "tyres_slick"],
  ["tyres_semi_slick", "tyres_slick"],
  ["safety_half_cage", "safety_full_roll_cage"],
] as const;

const modificationRequirementGroups = [
  {
    code: "req_ecu_stage_2_downpipe",
    sourceCode: "ecu_stage_2",
    description: "ECU Stage 2 requires a high-flow downpipe.",
    optionCodes: ["intake_exhaust_high_flow_downpipe"],
    sortOrder: 10,
  },
  {
    code: "req_flex_fuel_ecu",
    sourceCode: "engine_flex_fuel",
    description: "Flex fuel requires ECU Stage 1 or ECU Stage 2.",
    optionCodes: ["ecu_stage_1", "ecu_stage_2"],
    sortOrder: 20,
  },
] as const;

function decimalFromEnv(name: string): Prisma.Decimal {
  return new Prisma.Decimal(process.env[name] ?? "0.00");
}

function intFromEnv(name: string): number {
  const parsed = Number.parseInt(process.env[name] ?? "0", 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function main() {
  const event = await prisma.event.upsert({
    where: { slug: eventSlug },
    update: {
      code: "KULA",
      name: "Kula MyTrack",
      venue: "Kula MyTrack",
      startsAt: new Date("2026-09-20T06:00:00+03:00"),
      endsAt: new Date("2026-09-20T18:00:00+03:00"),
      timezone: "Europe/Istanbul",
      status: "PUBLISHED",
    },
    create: {
      code: "KULA",
      slug: eventSlug,
      name: "Kula MyTrack",
      venue: "Kula MyTrack",
      startsAt: new Date("2026-09-20T06:00:00+03:00"),
      endsAt: new Date("2026-09-20T18:00:00+03:00"),
      timezone: "Europe/Istanbul",
      status: "PUBLISHED",
      participantSequenceNext: 1,
    },
  });

  await prisma.eventPackageDay.deleteMany({
    where: {
      package: {
        eventId: event.id,
        code: { not: "SEP20" },
      },
    },
  });

  await prisma.eventPackage.deleteMany({
    where: {
      eventId: event.id,
      code: { not: "SEP20" },
    },
  });

  await prisma.eventDay.deleteMany({
    where: {
      eventId: event.id,
      date: { not: sep20 },
    },
  });

  const day20 = await prisma.eventDay.upsert({
    where: { eventId_date: { eventId: event.id, date: sep20 } },
    update: { label: "Sunday, 20 September 2026" },
    create: {
      eventId: event.id,
      date: sep20,
      label: "Sunday, 20 September 2026",
    },
  });

  const package20 = await prisma.eventPackage.upsert({
    where: { eventId_code: { eventId: event.id, code: "SEP20" } },
    update: {
      name: "Sunday Track Day",
      price: decimalFromEnv("SEED_PACKAGE_SEP20_PRICE"),
      capacity: intFromEnv("SEED_PACKAGE_SEP20_CAPACITY"),
      active: true,
    },
    create: {
      eventId: event.id,
      code: "SEP20",
      name: "Sunday Track Day",
      price: decimalFromEnv("SEED_PACKAGE_SEP20_PRICE"),
      currency: "TRY",
      capacity: intFromEnv("SEED_PACKAGE_SEP20_CAPACITY"),
      active: true,
    },
  });

  const links = [{ packageId: package20.id, eventDayId: day20.id }];

  for (const link of links) {
    await prisma.eventPackageDay.upsert({
      where: { packageId_eventDayId: link },
      update: {},
      create: link,
    });
  }

  const definitionsByCode = await seedModificationCatalog();
  await seedModificationConflicts(definitionsByCode);
  await seedModificationRequirements(definitionsByCode);

  console.log(`Seeded ${event.name} with ${links.length} package-day links.`);
  console.log(`Seeded ${modificationCatalog.length} modification definitions.`);
}

async function seedModificationCatalog() {
  const definitionsByCode = new Map<string, { id: string }>();

  for (const item of modificationCatalog) {
    const definition = await prisma.modificationDefinition.upsert({
      where: { code: item.code },
      update: {
        category: item.category,
        brand: "brand" in item ? item.brand : null,
        name: item.name,
        variant: "variant" in item ? item.variant : null,
        description: null,
        active: true,
        sortOrder: item.sortOrder,
      },
      create: {
        code: item.code,
        category: item.category,
        brand: "brand" in item ? item.brand : null,
        name: item.name,
        variant: "variant" in item ? item.variant : null,
        description: null,
        active: true,
        sortOrder: item.sortOrder,
      },
      select: {
        id: true,
      },
    });

    definitionsByCode.set(item.code, definition);
  }

  return definitionsByCode;
}

async function seedModificationConflicts(
  definitionsByCode: Map<string, { id: string }>,
) {
  for (const [sourceCode, targetCode] of modificationConflictCodePairs) {
    const sourceDefinition = definitionsByCode.get(sourceCode);
    const targetDefinition = definitionsByCode.get(targetCode);

    if (!sourceDefinition || !targetDefinition) {
      throw new Error(`Missing modification definition for conflict ${sourceCode}:${targetCode}`);
    }

    await prisma.modificationRule.upsert({
      where: {
        sourceDefinitionId_targetDefinitionId_ruleType: {
          sourceDefinitionId: sourceDefinition.id,
          targetDefinitionId: targetDefinition.id,
          ruleType: "CONFLICTS_WITH",
        },
      },
      update: {
        active: true,
      },
      create: {
        sourceDefinitionId: sourceDefinition.id,
        targetDefinitionId: targetDefinition.id,
        ruleType: "CONFLICTS_WITH",
        active: true,
      },
    });
  }
}

async function seedModificationRequirements(
  definitionsByCode: Map<string, { id: string }>,
) {
  for (const group of modificationRequirementGroups) {
    const sourceDefinition = definitionsByCode.get(group.sourceCode);

    if (!sourceDefinition) {
      throw new Error(`Missing modification definition for requirement ${group.code}`);
    }

    const requirementGroup = await prisma.modificationRequirementGroup.upsert({
      where: {
        code: group.code,
      },
      update: {
        sourceDefinitionId: sourceDefinition.id,
        description: group.description,
        active: true,
        sortOrder: group.sortOrder,
      },
      create: {
        code: group.code,
        sourceDefinitionId: sourceDefinition.id,
        description: group.description,
        active: true,
        sortOrder: group.sortOrder,
      },
      select: {
        id: true,
      },
    });

    const activeRequiredIds = new Set<string>();

    for (const optionCode of group.optionCodes) {
      const requiredDefinition = definitionsByCode.get(optionCode);

      if (!requiredDefinition) {
        throw new Error(`Missing modification definition for requirement option ${optionCode}`);
      }

      activeRequiredIds.add(requiredDefinition.id);

      await prisma.modificationRequirementOption.upsert({
        where: {
          requirementGroupId_requiredDefinitionId: {
            requirementGroupId: requirementGroup.id,
            requiredDefinitionId: requiredDefinition.id,
          },
        },
        update: {},
        create: {
          requirementGroupId: requirementGroup.id,
          requiredDefinitionId: requiredDefinition.id,
        },
      });
    }

    await prisma.modificationRequirementOption.deleteMany({
      where: {
        requirementGroupId: requirementGroup.id,
        requiredDefinitionId: {
          notIn: [...activeRequiredIds],
        },
      },
    });
  }
}

function pairwise<T>(items: readonly T[]) {
  const pairs: Array<readonly [T, T]> = [];

  for (let sourceIndex = 0; sourceIndex < items.length; sourceIndex += 1) {
    for (let targetIndex = sourceIndex + 1; targetIndex < items.length; targetIndex += 1) {
      pairs.push([items[sourceIndex], items[targetIndex]]);
    }
  }

  return pairs;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
