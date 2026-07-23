import assert from "node:assert/strict";
import { registerHooks } from "node:module";

import {
  ModificationCategory,
  type VehiclePowertrain,
} from "@prisma/client";
import {
  missingModificationSupportGroups,
  modificationSupportAdvisoryMessage,
} from "../src/lib/modification-catalog-metadata";
import type {
  VehicleBuildDefinitionForRules,
  VehicleBuildInstalledModification,
  VehicleBuildVehicle,
} from "../src/lib/vehicle-build-rules";
import type { VehicleRatingModificationInput } from "../src/lib/vehicle-performance-rating";
import { readRepoFile } from "./catalog-source-utils";

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  registerServerOnlyValidatorStub();
  const [buildRules, ratingEngine] = await Promise.all([
    import("../src/lib/vehicle-build-rules"),
    import("../src/lib/vehicle-performance-rating"),
  ]);
  const vehicle = buildVehicle();
  const supportDefinitions = [
    definition("ecu-unlock", "ecu_unlock", ModificationCategory.ECU),
    definition("downpipe", "downpipe", ModificationCategory.INTAKE_EXHAUST),
    definition("e25-fuel", "fuel_configuration", ModificationCategory.ENGINE),
    definition(
      "transmission-software",
      "transmission_software",
      ModificationCategory.DRIVETRAIN,
    ),
  ];
  const rsa320 = definition(
    "rsa-320",
    "ecu_software",
    ModificationCategory.ECU,
    {
      code: "rsa_bmw_b48_g20_320_e25",
      requirementGroups: supportDefinitions.map((support) => ({
        active: true,
        description: `${support.name} öneriliyor.`,
        options: [
          {
            requiredDefinitionId: support.id,
            requiredDefinition: support,
          },
        ],
      })),
    },
  );

  assert.equal(
    modificationSupportAdvisoryMessage,
    "Bu kurulum için destekleyici parçalar öneriliyor. Build yine de kaydedilebilir.",
  );
  assert.equal(
    missingModificationSupportGroups(rsa320, []).length,
    supportDefinitions.length,
  );
  for (const support of supportDefinitions) {
    const availableIds = supportDefinitions
      .filter((candidate) => candidate.id !== support.id)
      .map((candidate) => candidate.id);
    assert.deepEqual(
      missingModificationSupportGroups(rsa320, availableIds).map(
        (group) => group.options[0]?.requiredDefinitionId,
      ),
      [support.id],
    );
  }

  assert.deepEqual(
    buildRules.evaluateModificationAvailability({
      vehicle,
      definition: rsa320,
      installedModifications: [],
    }),
    { ok: true, code: null },
  );
  assert.deepEqual(
    buildRules.evaluateModificationBatchAvailability({
      vehicle,
      definitions: [rsa320],
      installedModifications: [],
    }),
    { ok: true, code: null },
  );

  const installedSupport = installed(supportDefinitions[0]!);
  const installedTune = installed(rsa320);
  assert.deepEqual(
    buildRules.evaluateModificationRemoval({
      removingModification: installedSupport,
      installedModifications: [installedSupport, installedTune],
    }),
    { ok: true, code: null },
  );

  const baseRating = calculateRating(ratingEngine, []);
  const tuneOnlyRating = calculateRating(ratingEngine, [
    ratingModification(rsa320.code!, "ecu_software", 22),
  ]);
  const tuneWithNeutralSupportRating = calculateRating(ratingEngine, [
    ratingModification(rsa320.code!, "ecu_software", 22),
    ratingModification("support", "intercooler", 0, ModificationCategory.COOLING),
  ]);
  assert.equal(tuneOnlyRating?.power, (baseRating?.power ?? 0) + 22);
  assert.equal(tuneWithNeutralSupportRating?.power, tuneOnlyRating?.power);

  assertBlockedBySlot(buildRules, vehicle, "ecu_software", ModificationCategory.ECU);
  assertBlockedBySlot(
    buildRules,
    vehicle,
    "tyre_trackday",
    ModificationCategory.TYRES,
  );
  assertBlockedBySlot(buildRules, vehicle, "wheel", ModificationCategory.WHEELS);

  const incompatible = definition(
    "incompatible",
    "intake",
    ModificationCategory.INTAKE_EXHAUST,
    {
      compatibilities: [
        {
          active: true,
          vehicleDefinitionId: "another-vehicle",
          platformFamilyId: null,
          engineFamilyId: null,
          vehicleBrand: null,
          vehicleModel: null,
          yearFrom: null,
          yearTo: null,
        },
      ],
    },
  );
  assert.equal(
    buildRules.evaluateModificationAvailability({
      vehicle,
      definition: incompatible,
      installedModifications: [],
    }).code,
    "MODIFICATION_INCOMPATIBLE",
  );

  const nonLeaf = definition(
    "non-leaf",
    "intake",
    ModificationCategory.INTAKE_EXHAUST,
    { code: "intake_exhaust_intake", brand: null, variant: null },
  );
  assert.equal(
    buildRules.evaluateModificationAvailability({
      vehicle,
      definition: nonLeaf,
      installedModifications: [],
    }).code,
    "MODIFICATION_NOT_SELECTABLE",
  );
  assert.equal(
    buildRules.evaluateModificationAvailability({
      vehicle,
      definition: rsa320,
      installedModifications: [installedTune],
    }).code,
    "DUPLICATE_MODIFICATION",
  );

  const seed = readRepoFile("prisma/seed.ts");
  assert.match(seed, /req_rsa_320_e25_ecu_unlock/);
  assert.match(seed, /req_rsa_320_e25_downpipe/);
  assert.match(seed, /req_rsa_320_e25_fuel/);
  assert.match(seed, /req_rsa_320_e25_transmission_software/);
  assert.doesNotMatch(
    seed,
    /vehicleModification\.(?:delete|deleteMany)\(/,
  );

  console.log("Advisory dependency validation passed.");
  console.log("RSA 320 support groups retained: 4");
  console.log("Missing support save blockers: 0");
  console.log("Missing support rating suppression: 0");
  console.log("ECU, tyre, and wheel slot exclusivity: passed");
  console.log("Compatibility, non-leaf, and duplicate blockers: passed");
  console.log("Existing build relation preservation: passed");
}

function assertBlockedBySlot(
  buildRules: typeof import("../src/lib/vehicle-build-rules"),
  vehicle: VehicleBuildVehicle,
  componentTypeCode: string,
  category: ModificationCategory,
) {
  const first = definition(`${componentTypeCode}-a`, componentTypeCode, category);
  const second = definition(`${componentTypeCode}-b`, componentTypeCode, category);
  const result = buildRules.evaluateModificationAvailability({
    vehicle,
    definition: second,
    installedModifications: [installed(first)],
  });
  assert.equal(result.code, "COMPONENT_SLOT_OCCUPIED");
}

function buildVehicle(): VehicleBuildVehicle {
  return {
    id: "vehicle",
    userId: "member",
    vehicleDefinitionId: "vehicle-definition",
    vehicleDefinition: {
      powertrain: "ICE" as VehiclePowertrain,
      platformFamilyId: "platform",
      engineFamilyId: "engine",
    },
    brand: "BMW",
    model: "320i",
    year: 2024,
    deletedAt: null,
  };
}

function definition(
  id: string,
  componentTypeCode: string,
  category: ModificationCategory,
  overrides: Partial<VehicleBuildDefinitionForRules> = {},
): VehicleBuildDefinitionForRules {
  return {
    id,
    code: `fixture_${id}`,
    category,
    brand: "Fixture",
    name: id,
    variant: "Concrete",
    componentTypeCode,
    active: true,
    compatibilities: [],
    powertrainApplicabilities: [],
    requirementGroups: [],
    rulesAsSource: [],
    rulesAsTarget: [],
    ...overrides,
  };
}

function installed(
  value: VehicleBuildDefinitionForRules,
): VehicleBuildInstalledModification {
  return {
    id: `installed-${value.id}`,
    modificationDefinitionId: value.id,
    modificationDefinition: value,
  };
}

function calculateRating(
  ratingEngine: typeof import("../src/lib/vehicle-performance-rating"),
  installedModifications: VehicleRatingModificationInput[],
) {
  return ratingEngine.calculateVehiclePerformanceRating({
    vehicleDefinition: {
      id: "vehicle-definition",
      powerRating: 50,
      handlingRating: 50,
      brakingRating: 50,
      reliabilityRating: 50,
      thermalRating: 50,
      trackReadinessRating: 50,
      weightPenalty: 0,
      ratingStatus: "CALIBRATED",
    },
    installedModifications,
  });
}

function ratingModification(
  code: string,
  componentTypeCode: string,
  powerImpact: number,
  category: ModificationCategory = ModificationCategory.ECU,
): VehicleRatingModificationInput {
  return {
    modificationDefinitionId: code,
    modificationDefinition: {
      code,
      category,
      componentTypeCode,
      powerImpact: 0,
      handlingImpact: 0,
      brakingImpact: 0,
      reliabilityImpact: 0,
      trackReadinessImpact: 0,
      modificationImpacts: [
        {
          vehicleDefinitionId: "vehicle-definition",
          powerImpact,
          handlingImpact: 0,
          brakingImpact: 0,
          reliabilityImpact: 0,
          thermalImpact: 0,
          trackReadinessImpact: 0,
          active: true,
        },
      ],
    },
  };
}

function registerServerOnlyValidatorStub() {
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "server-only") {
        return {
          url: "data:text/javascript,export%20{}",
          shortCircuit: true,
        };
      }

      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (url === "data:text/javascript,export%20{}") {
        return {
          format: "module",
          source: "export {};",
          shortCircuit: true,
        };
      }

      return nextLoad(url, context);
    },
  });
}
