import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { registerHooks } from "node:module";

import {
  ModificationCategory,
  type VehiclePowertrain,
} from "@prisma/client";
import { isSelectableModificationLeaf } from "../src/lib/modification-catalog-metadata";
import type {
  VehicleBuildDefinitionForRules,
  VehicleBuildInstalledModification,
  VehicleBuildVehicle,
} from "../src/lib/vehicle-build-rules";
import type { VehicleRatingModificationInput } from "../src/lib/vehicle-performance-rating";
import {
  extractModificationRows,
  readRepoFile,
} from "./catalog-source-utils";

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
  const seed = readRepoFile("prisma/seed.ts");
  const baselineSeed = execFileSync("git", ["show", "main:prisma/seed.ts"], {
    encoding: "utf8",
  });
  const wheelRows = extractModificationRows(seed).filter(
    (row) => row.category === "WHEELS",
  );
  const baselineCodes = new Set(
    extractModificationRows(baselineSeed)
      .filter((row) => row.category === "WHEELS")
      .map((row) => row.code),
  );
  const newWheelRows = wheelRows.filter((row) => !baselineCodes.has(row.code));
  const selectableWheelRows = wheelRows.filter(isSelectableModificationLeaf);

  for (const row of newWheelRows) {
    assert.equal(row.powerImpact, 0, `${row.code} power impact`);
    assert.equal(row.handlingImpact, 0, `${row.code} handling impact`);
    assert.equal(row.brakingImpact, 0, `${row.code} braking impact`);
    assert.equal(row.reliabilityImpact, 0, `${row.code} reliability impact`);
    assert.equal(
      row.trackReadinessImpact,
      0,
      `${row.code} track-readiness impact`,
    );
  }

  validateRatingBehavior(ratingEngine);
  validateWheelExclusivity(buildRules);
  validateRatingDataSelections();
  assert.doesNotMatch(
    seed,
    /vehicleModification\.(?:delete|deleteMany)\(/,
  );

  console.log("Wheel rating audit passed.");
  console.log(`Wheel definitions: ${wheelRows.length}`);
  console.log(`Selectable concrete wheel leaves: ${selectableWheelRows.length}`);
  console.log(`Unknown-weight additions neutral: ${newWheelRows.length}`);
  console.log("Measured lighter wheel behavior: passed");
  console.log("Measured heavier wheel behavior: passed");
  console.log("Construction-only and large-diameter bonuses: 0");
  console.log("Multiple wheel rating stacking: prevented");
  console.log("Single wheel-set exclusivity: passed");
  console.log("Rating data selections: passed");
  console.log("Existing build relation preservation: passed");
}

function validateRatingBehavior(
  ratingEngine: typeof import("../src/lib/vehicle-performance-rating"),
) {
  const base = calculateRating(ratingEngine, []);
  assert.ok(base);

  const unknown = calculateRating(ratingEngine, [
    ratingWheel("unknown", {
      construction: "FORGED",
      weightKg: null,
      handlingImpact: 9,
      brakingImpact: 9,
      trackReadinessImpact: 9,
      platformHandlingImpact: 9,
    }),
  ]);
  assert.deepEqual(unknown, base);

  const inactiveSpecification = calculateRating(ratingEngine, [
    ratingWheel("inactive", {
      construction: "FLOW_FORMED",
      weightKg: 8.5,
      specificationActive: false,
    }),
  ]);
  assert.deepEqual(inactiveSpecification, base);

  const lighter = calculateRating(ratingEngine, [
    ratingWheel("lighter", {
      construction: "CAST",
      weightKg: 8.5,
    }),
  ]);
  assert.equal(lighter?.handling, (base?.handling ?? 0) + 2);
  assert.equal(lighter?.braking, (base?.braking ?? 0) + 1);
  assert.equal(
    lighter?.trackReadiness,
    (base?.trackReadiness ?? 0) + 1,
  );

  const heavier = calculateRating(ratingEngine, [
    ratingWheel("heavier", {
      construction: "FORGED",
      weightKg: 14,
    }),
  ]);
  assert.equal(heavier?.handling, (base?.handling ?? 0) - 2);
  assert.equal(heavier?.braking, (base?.braking ?? 0) - 1);
  assert.equal(
    heavier?.trackReadiness,
    (base?.trackReadiness ?? 0) - 1,
  );

  const largeButNotLight = calculateRating(ratingEngine, [
    ratingWheel("large", {
      construction: "FORGED",
      diameterInches: 20,
      widthInches: 10,
      weightKg: 14,
    }),
  ]);
  assert.deepEqual(largeButNotLight, base);

  const forgedAtKnownWeight = calculateRating(ratingEngine, [
    ratingWheel("forged-same-weight", {
      construction: "FORGED",
      weightKg: 8.5,
    }),
  ]);
  assert.deepEqual(forgedAtKnownWeight, lighter);

  const stacked = calculateRating(ratingEngine, [
    ratingWheel("lighter-a", {
      construction: "FLOW_FORMED",
      weightKg: 8.5,
    }),
    ratingWheel("lighter-b", {
      construction: "FORGED",
      weightKg: 8.5,
    }),
  ]);
  assert.deepEqual(stacked, lighter);
}

function validateWheelExclusivity(
  buildRules: typeof import("../src/lib/vehicle-build-rules"),
) {
  const first = ruleWheel("wheel-a", "wheel");
  const replacement = ruleWheel("wheel-b", "forged_wheel");
  const futureType = ruleWheel("wheel-c", "competition_wheel");
  const vehicle = fixtureVehicle();

  assert.equal(buildRules.componentSlotKeyForDefinition(first), "wheel");
  assert.equal(buildRules.componentSlotKeyForDefinition(replacement), "wheel");
  assert.equal(buildRules.componentSlotKeyForDefinition(futureType), "wheel");
  assert.equal(
    buildRules.evaluateModificationAvailability({
      vehicle,
      definition: replacement,
      installedModifications: [installed(first)],
    }).code,
    "COMPONENT_SLOT_OCCUPIED",
  );
  assert.equal(
    buildRules.evaluateModificationBatchAvailability({
      vehicle,
      definitions: [first, futureType],
      installedModifications: [],
    }).code,
    "COMPONENT_SLOT_OCCUPIED",
  );
}

function validateRatingDataSelections() {
  for (const path of [
    "src/lib/mobile-garage.ts",
    "src/lib/mobile-garage-detail.ts",
    "src/lib/rating-discovery.ts",
    "src/app/account/garage/page.tsx",
    "src/app/account/garage/[id]/page.tsx",
    "src/app/admin/members/[id]/page.tsx",
    "src/app/account/garage/actions.ts",
  ]) {
    const source = readRepoFile(path);

    assert.match(source, /wheelSpecification:\s*\{\s*select:/, path);
    assert.match(source, /nominalDiameterInches:\s*true/, path);
    assert.match(source, /weightKg:\s*true/, path);
  }
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

function ratingWheel(
  code: string,
  {
    construction,
    diameterInches = 18,
    widthInches = 9,
    weightKg,
    specificationActive = true,
    handlingImpact = 0,
    brakingImpact = 0,
    trackReadinessImpact = 0,
    platformHandlingImpact,
  }: {
    construction: string;
    diameterInches?: number;
    widthInches?: number;
    weightKg: number | null;
    specificationActive?: boolean;
    handlingImpact?: number;
    brakingImpact?: number;
    trackReadinessImpact?: number;
    platformHandlingImpact?: number;
  },
): VehicleRatingModificationInput {
  return {
    modificationDefinitionId: code,
    modificationDefinition: {
      code,
      category: ModificationCategory.WHEELS,
      componentTypeCode: "wheel",
      powerImpact: 0,
      handlingImpact,
      brakingImpact,
      reliabilityImpact: 0,
      trackReadinessImpact,
      wheelSpecification: {
        active: specificationActive,
        construction,
        nominalDiameterInches: diameterInches,
        nominalWidthInches: widthInches,
        weightKg,
        trackSuitability: 80,
        roadSuitability: 80,
      },
      modificationImpacts:
        platformHandlingImpact === undefined
          ? []
          : [
              {
                vehicleDefinitionId: "vehicle-definition",
                powerImpact: 0,
                handlingImpact: platformHandlingImpact,
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

function ruleWheel(
  id: string,
  componentTypeCode: string,
): VehicleBuildDefinitionForRules {
  return {
    id,
    code: `fixture_${id}`,
    category: ModificationCategory.WHEELS,
    brand: "Fixture",
    name: "Wheel",
    variant: id,
    componentTypeCode,
    active: true,
    compatibilities: [],
    powertrainApplicabilities: [],
    requirementGroups: [],
    rulesAsSource: [],
    rulesAsTarget: [],
  };
}

function installed(
  definition: VehicleBuildDefinitionForRules,
): VehicleBuildInstalledModification {
  return {
    id: `installed-${definition.id}`,
    modificationDefinitionId: definition.id,
    modificationDefinition: definition,
  };
}

function fixtureVehicle(): VehicleBuildVehicle {
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
