import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import {
  ModificationCategory,
  ModificationRuleType,
  VehiclePowertrain,
} from "@prisma/client";
import {
  buildMobileGarageBuildResponseBody,
  buildMobileGarageImageUploadIntentResponseBody,
  buildMobileGarageRatingPreviewResponseBody,
  buildMobileGarageVehicleDetailResponseBody,
  mobileGarageDetailContractHeader,
  mobileGarageDetailContractVersion,
  mobileGarageDetailErrorResponse,
  parseMobileGarageCatalogMatchBody,
  parseMobileGarageImageFinalizeBody,
  parseMobileGarageImageUploadIntentBody,
  parseMobileGarageModificationIds,
  parseMobileGarageVehicleEditBody,
} from "../src/lib/mobile-garage-detail-contract";
import {
  MobileGarageError,
  type MobileGarageErrorCode,
} from "../src/lib/mobile-garage-contract";
import { MobileAuthError } from "../src/lib/mobile-auth";
import { modificationTypeGroup } from "../src/lib/modification-presentation";
import {
  maxVehicleImageBytes,
  readOwnedVehicleImageMimeType,
  validateVehicleImageFile,
  validateVehicleImageMetadata,
} from "../src/lib/vehicle-images";
import type {
  VehicleBuildDefinitionForRules,
  VehicleBuildInstalledModification,
  VehicleBuildVehicle,
} from "../src/lib/vehicle-build-rules";

let assertions = 0;

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
  validateEditBody();
  validateModificationBodies();
  validateImageBodies();
  validateSafeResponses();
  await validateImageFiles();
  await validateErrorsAndHeaders();
  validateAuthoritativeBuildRules(buildRules);
  validateRatingPreviewPurity(ratingEngine);
  validateRouteAndDomainGuards();
  console.log(`validate-mobile-garage-detail-api passed (${assertions} assertions)`);
}

function validateImageBodies() {
  equal(
    parseMobileGarageImageUploadIntentBody({
      mimeType: "image/jpeg",
      fileSize: 1024,
    }),
    { mimeType: "image/jpeg", fileSize: 1024 },
  );
  equal(
    parseMobileGarageImageUploadIntentBody({
      mimeType: "image/jpeg",
      fileSize: 1024,
      userId: "forged",
    }),
    null,
  );
  equal(
    parseMobileGarageImageUploadIntentBody({
      mimeType: "image/jpeg",
      fileSize: 0,
    }),
    null,
  );
  equal(
    parseMobileGarageImageFinalizeBody({
      objectPath:
        "member-one/vehicle-one/cover-123e4567-e89b-42d3-a456-426614174000.jpg",
    }),
    {
      objectPath:
        "member-one/vehicle-one/cover-123e4567-e89b-42d3-a456-426614174000.jpg",
    },
  );
  equal(
    parseMobileGarageImageFinalizeBody({
      objectPath: " member-one/vehicle-one/cover.jpg",
    }),
    null,
  );

  equal(
    validateVehicleImageMetadata({ mimeType: "image/png", fileSize: 2048 }),
    { ok: true, mimeType: "image/png" },
  );
  equal(
    validateVehicleImageMetadata({
      mimeType: "image/png",
      fileSize: maxVehicleImageBytes + 1,
    }),
    { ok: false, error: "file_too_large" },
  );
  equal(
    validateVehicleImageMetadata({ mimeType: "image/heic", fileSize: 2048 }),
    { ok: false, error: "unsupported_format" },
  );

  const objectPath =
    "member-one/vehicle-one/cover-123e4567-e89b-42d3-a456-426614174000.webp";
  equal(
    readOwnedVehicleImageMimeType({
      objectPath,
      userId: "member-one",
      vehicleId: "vehicle-one",
    }),
    "image/webp",
  );
  equal(
    readOwnedVehicleImageMimeType({
      objectPath,
      userId: "member-two",
      vehicleId: "vehicle-one",
    }),
    null,
  );

  equal(
    buildMobileGarageImageUploadIntentResponseBody({
      objectPath,
      token: "synthetic-upload-capability",
    }),
    {
      data: {
        upload: { objectPath, token: "synthetic-upload-capability" },
      },
    },
  );
}

function validateAuthoritativeBuildRules(
  buildRules: typeof import("../src/lib/vehicle-build-rules"),
) {
  const {
    evaluateModificationAvailability,
    evaluateModificationBatchAvailability,
    evaluateModificationRemoval,
  } = buildRules;
  const vehicle = buildVehicle();
  const compatible = buildDefinition({ id: "compatible" });
  equal(
    evaluateModificationAvailability({
      vehicle,
      definition: compatible,
      installedModifications: [],
    }),
    { ok: true, code: null },
  );

  const incompatible = buildDefinition({
    id: "incompatible",
    compatibilities: [
      {
        active: true,
        vehicleDefinitionId: null,
        platformFamilyId: null,
        engineFamilyId: null,
        vehicleBrand: "Other",
        vehicleModel: null,
        yearFrom: null,
        yearTo: null,
      },
    ],
  });
  equal(
    evaluateModificationAvailability({
      vehicle,
      definition: incompatible,
      installedModifications: [],
    }),
    { ok: false, code: "MODIFICATION_INCOMPATIBLE" },
  );

  const installedBrake = installedDefinition(
    buildDefinition({ id: "installed-brake", componentTypeCode: "brake_pad" }),
  );
  equal(
    evaluateModificationAvailability({
      vehicle,
      definition: buildDefinition({ id: "next-brake", componentTypeCode: "brake_pad" }),
      installedModifications: [installedBrake],
    }).code,
    "COMPONENT_SLOT_OCCUPIED",
  );
  equal(
    evaluateModificationAvailability({
      vehicle,
      definition: compatible,
      installedModifications: [installedDefinition(compatible)],
    }).code,
    "DUPLICATE_MODIFICATION",
  );

  const prerequisite = buildDefinition({ id: "prerequisite" });
  const requiring = buildDefinition({
    id: "requiring",
    requirementGroups: [
      {
        active: true,
        description: "Supporting part required",
        options: [
          {
            requiredDefinitionId: prerequisite.id,
            requiredDefinition: prerequisite,
          },
        ],
      },
    ],
  });
  equal(
    evaluateModificationAvailability({
      vehicle,
      definition: requiring,
      installedModifications: [],
    }).code,
    "MODIFICATION_REQUIREMENT_MISSING",
  );

  const conflictTarget = buildDefinition({ id: "conflict-target" });
  const conflictSource = buildDefinition({
    id: "conflict-source",
    rulesAsSource: [
      {
        active: true,
        targetDefinitionId: conflictTarget.id,
        ruleType: ModificationRuleType.CONFLICTS_WITH,
      },
    ],
  });
  equal(
    evaluateModificationAvailability({
      vehicle,
      definition: conflictSource,
      installedModifications: [installedDefinition(conflictTarget)],
    }).code,
    "MODIFICATION_CONFLICT",
  );

  equal(
    evaluateModificationBatchAvailability({
      vehicle,
      definitions: [buildDefinition({ id: "inactive", active: false })],
      installedModifications: [],
    }).code,
    "DEFINITION_INACTIVE",
  );

  const installedPrerequisite = installedDefinition(prerequisite);
  const installedRequiring = installedDefinition(requiring);
  equal(
    evaluateModificationRemoval({
      removingModification: installedPrerequisite,
      installedModifications: [installedPrerequisite, installedRequiring],
    }).code,
    "MODIFICATION_REQUIRED_BY_INSTALLED_ITEM",
  );
}

function validateRatingPreviewPurity(
  ratingEngine: typeof import("../src/lib/vehicle-performance-rating"),
) {
  const {
    calculateProjectedVehiclePerformanceRating,
    calculateVehiclePerformanceRating,
  } = ratingEngine;
  const vehicleDefinition = {
    id: "vehicle-definition",
    powerRating: 70,
    handlingRating: 70,
    brakingRating: 70,
    reliabilityRating: 70,
    thermalRating: 70,
    trackReadinessRating: 70,
    weightPenalty: 0,
    ratingStatus: "CALIBRATED" as const,
  };
  const installed: Parameters<
    typeof calculateVehiclePerformanceRating
  >[0]["installedModifications"] = [];
  const proposed = [
    {
      modificationDefinitionId: "brake-upgrade",
      modificationDefinition: {
        id: "brake-upgrade",
        code: "brake_upgrade",
        category: ModificationCategory.BRAKES,
        powerImpact: 0,
        handlingImpact: 1,
        brakingImpact: 6,
        reliabilityImpact: 0,
        trackReadinessImpact: 2,
        modificationImpacts: [],
      },
    },
  ];
  const before = JSON.stringify(installed);
  const current = calculateVehiclePerformanceRating({
    vehicleDefinition,
    installedModifications: installed,
  });
  const projected = calculateProjectedVehiclePerformanceRating({
    vehicleDefinition,
    installedModifications: installed,
    proposedModifications: proposed,
  });

  equal(JSON.stringify(installed), before);
  ok(Boolean(current && projected && projected.braking > current.braking));
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

function buildVehicle(): VehicleBuildVehicle {
  return {
    id: "vehicle",
    userId: "member",
    vehicleDefinitionId: "vehicle-definition",
    vehicleDefinition: {
      powertrain: VehiclePowertrain.ICE,
      platformFamilyId: "platform",
      engineFamilyId: "engine",
    },
    brand: "Ford",
    model: "Focus RS",
    year: 2017,
    deletedAt: null,
  };
}

function buildDefinition(
  overrides: Partial<VehicleBuildDefinitionForRules> & { id: string },
): VehicleBuildDefinitionForRules {
  return {
    id: overrides.id,
    code: overrides.code ?? `code-${overrides.id}`,
    category: overrides.category ?? ModificationCategory.BRAKES,
    brand: overrides.brand ?? "ATS",
    name: overrides.name ?? overrides.id,
    variant: overrides.variant ?? null,
    componentTypeCode: overrides.componentTypeCode ?? null,
    active: overrides.active ?? true,
    compatibilities: overrides.compatibilities ?? [],
    powertrainApplicabilities: overrides.powertrainApplicabilities ?? [],
    requirementGroups: overrides.requirementGroups ?? [],
    rulesAsSource: overrides.rulesAsSource ?? [],
    rulesAsTarget: overrides.rulesAsTarget ?? [],
  };
}

function installedDefinition(
  definition: VehicleBuildDefinitionForRules,
): VehicleBuildInstalledModification {
  return {
    id: `installed-${definition.id}`,
    modificationDefinitionId: definition.id,
    modificationDefinition: definition,
  };
}

function validateEditBody() {
  equal(
    parseMobileGarageVehicleEditBody({
      vehicleDefinitionId: "definition-1",
      brand: " Ford ",
      model: " Focus RS ",
      year: 2017,
      plateNumber: "34ats123",
      color: " Mavi ",
    }),
    {
      vehicleDefinitionId: "definition-1",
      brand: "Ford",
      model: "Focus RS",
      year: 2017,
      plateNumber: "34 ATS 123",
      color: "Mavi",
    },
  );

  for (const body of [
    null,
    {},
    {
      vehicleDefinitionId: null,
      brand: "Ford",
      model: "Focus RS",
      year: 2017,
      plateNumber: "34 ATS 123",
      color: null,
      isPrimary: true,
    },
    {
      vehicleDefinitionId: null,
      brand: "Ford",
      model: "Focus RS",
      year: 2017,
      plateNumber: "34 ATS 123",
      color: null,
      userId: "must-not-be-accepted",
    },
  ]) {
    equal(parseMobileGarageVehicleEditBody(body), null);
  }
}

function validateModificationBodies() {
  equal(parseMobileGarageModificationIds({ modificationDefinitionIds: ["a", "b"] }), ["a", "b"]);
  for (const body of [
    null,
    { modificationDefinitionIds: [] },
    { modificationDefinitionIds: ["a", "a"] },
    { modificationDefinitionIds: Array.from({ length: 21 }, (_, index) => String(index)) },
    { modificationDefinitionIds: ["a"], userId: "must-not-be-accepted" },
  ]) {
    equal(parseMobileGarageModificationIds(body), null);
  }

  equal(parseMobileGarageCatalogMatchBody({ memberNote: "  Pist aracı  " }), {
    memberNote: "Pist aracı",
  });
  equal(parseMobileGarageCatalogMatchBody({ memberNote: null }), { memberNote: null });
  equal(parseMobileGarageCatalogMatchBody({ memberNote: "a".repeat(501) }), null);
  equal(
    parseMobileGarageCatalogMatchBody({ memberNote: null, email: "must-not-be-accepted" }),
    null,
  );
}

function validateSafeResponses() {
  const ratingWithInternalCap = { ...rating(), overallCap: 72 };
  const detail = buildMobileGarageVehicleDetailResponseBody({
    id: "vehicle-1",
    brand: "Ford",
    model: "Focus RS",
    year: 2017,
    plateNumber: "34 ATS 123",
    color: "Mavi",
    isPrimary: true,
    archived: false,
    coverImageUrl: "https://storage.example.test/signed-cover",
    image: {
      hasImage: true,
      acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      maxBytes: maxVehicleImageBytes,
    },
    vehicleDefinition: {
      id: "definition-1",
      brand: "Ford",
      model: "Focus RS",
      generation: "Mk3",
      chassisCode: null,
      variant: "2.3 EcoBoost",
      ratingStatus: "CALIBRATED",
    },
    catalogMatch: { latestStatus: null, canRequest: false },
    rating: ratingWithInternalCap,
    ratingDisclosure: "Safe disclosure",
    modifications: [installedModification()],
    actions: {
      canEdit: true,
      canSetPrimary: false,
      canManageImage: true,
      canManageBuild: true,
      canRequestCatalogMatch: false,
      canRestore: false,
      canPermanentlyDelete: false,
    },
  });
  const serializedDetail = JSON.stringify(detail);
  ok(!serializedDetail.includes("imagePath"));
  ok(!serializedDetail.includes("userId"));
  ok(!serializedDetail.includes("createdAt"));
  ok(!serializedDetail.includes("accessToken"));
  ok(!serializedDetail.includes("overallCap"));

  const build = buildMobileGarageBuildResponseBody({
    vehicleId: "vehicle-1",
    archived: false,
    currentRating: ratingWithInternalCap,
    installed: [installedModification()],
    catalog: [
      {
        id: "definition-1",
        category: "BRAKES",
        categoryLabel: "Fren",
        group: {
          key: "BRAKES:brake_pad",
          label: "Fren Balatası",
        },
        selectionGroupKey: "brake_pad",
        label: "ATS / Pist Balatası",
        brand: "ATS",
        name: "Pist Balatası",
        variant: null,
        description: "Safe description",
        status: "AVAILABLE",
        reasonCode: null,
        reason: null,
        conflictingModification: null,
        requirements: [],
        calibration: {
          confidence: "HIGH",
          sourceNote: null,
          provisional: false,
        },
      },
    ],
  });
  const serializedBuild = JSON.stringify(build);
  ok(!serializedBuild.includes("userId"));
  ok(!serializedBuild.includes("sortOrder"));
  ok(!serializedBuild.includes("imagePath"));
  ok(!serializedBuild.includes("customNotes"));
  ok(!serializedBuild.includes("installedAt"));
  ok(!serializedBuild.includes("componentTypeCode"));
  ok(!serializedBuild.includes("usageClass"));
  ok(!serializedBuild.includes("overallCap"));
  equal(build.data.build.catalog[0]?.group, {
    key: "BRAKES:brake_pad",
    label: "Fren Balatası",
  });
  equal(build.data.build.catalog[0]?.selectionGroupKey, "brake_pad");

  equal(
    modificationTypeGroup({
      category: ModificationCategory.COOLING,
      componentTypeCode: "oil_cooler",
      name: "Fallback oil cooler name",
    }),
    { key: "COOLING:oil_cooler", label: "Yağ Soğutucu" },
  );
  equal(
    modificationTypeGroup({
      category: ModificationCategory.COOLING,
      componentTypeCode: "intercooler",
      name: "Fallback intercooler name",
    }),
    { key: "COOLING:intercooler", label: "Intercooler" },
  );
  equal(
    modificationTypeGroup({
      category: ModificationCategory.COOLING,
      componentTypeCode: "radiator",
      name: "Fallback radiator name",
    }),
    { key: "COOLING:radiator", label: "Radyatör" },
  );

  const preview = buildMobileGarageRatingPreviewResponseBody({
    currentRating: ratingWithInternalCap,
    projectedRating: ratingWithInternalCap,
  });
  ok(!JSON.stringify(preview).includes("overallCap"));
}

async function validateImageFiles() {
  const jpeg = new File(
    [new Uint8Array([0xff, 0xd8, 0xff, 0xe0])],
    "vehicle.jpg",
    { type: "image/jpeg" },
  );
  equal(await validateVehicleImageFile(jpeg), {
    ok: true,
    mimeType: "image/jpeg",
  });

  const disguised = new File(
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    "vehicle.jpg",
    { type: "image/jpeg" },
  );
  equal(await validateVehicleImageFile(disguised), {
    ok: false,
    error: "unsupported_format",
  });

  const heic = new File([new Uint8Array([0, 0, 0, 0])], "vehicle.heic", {
    type: "image/heic",
  });
  equal(await validateVehicleImageFile(heic), {
    ok: false,
    error: "unsupported_format",
  });
}

async function validateErrorsAndHeaders() {
  const errors: Array<[MobileGarageErrorCode, number]> = [
    ["MOBILE_GARAGE_INVALID_BODY", 422],
    ["MOBILE_GARAGE_VEHICLE_NOT_FOUND", 404],
    ["MOBILE_GARAGE_EDIT_BLOCKED_BY_BUILD", 409],
    ["MOBILE_GARAGE_IMAGE_UNSUPPORTED_FORMAT", 422],
    ["MOBILE_GARAGE_IMAGE_TOO_LARGE", 413],
    ["MOBILE_GARAGE_STORAGE_UNAVAILABLE", 503],
    ["MOBILE_GARAGE_BUILD_UNAVAILABLE", 409],
    ["MOBILE_GARAGE_MODIFICATION_DUPLICATE", 409],
    ["MOBILE_GARAGE_MODIFICATION_SLOT_OCCUPIED", 409],
    ["MOBILE_GARAGE_MODIFICATION_INCOMPATIBLE", 409],
    ["MOBILE_GARAGE_MODIFICATION_CONFLICT", 409],
    ["MOBILE_GARAGE_MODIFICATION_REQUIREMENT_MISSING", 409],
    ["MOBILE_GARAGE_MODIFICATION_REQUIRED_BY_BUILD", 409],
  ];

  for (const [code, status] of errors) {
    const response = mobileGarageDetailErrorResponse(new MobileGarageError(code));
    const body = await response.json();
    equal(response.status, status);
    equal(response.headers.get("Cache-Control"), "no-store");
    equal(response.headers.get(mobileGarageDetailContractHeader), mobileGarageDetailContractVersion);
    equal(body.error.code, code);
    equal(Object.keys(body.error), ["code", "message"]);
  }

  const unauthorized = mobileGarageDetailErrorResponse(
    new MobileAuthError("MOBILE_AUTH_MISSING_TOKEN"),
  );
  equal(unauthorized.status, 401);
  equal(unauthorized.headers.get("WWW-Authenticate"), "Bearer");
  equal(unauthorized.headers.get("Cache-Control"), "no-store");
}

function validateRouteAndDomainGuards() {
  const routePaths = [
    "src/app/api/mobile/v1/garage/[vehicleId]/route.ts",
    "src/app/api/mobile/v1/garage/[vehicleId]/primary/route.ts",
    "src/app/api/mobile/v1/garage/[vehicleId]/image/route.ts",
    "src/app/api/mobile/v1/garage/[vehicleId]/image/upload-intent/route.ts",
    "src/app/api/mobile/v1/garage/[vehicleId]/image/finalize/route.ts",
    "src/app/api/mobile/v1/garage/[vehicleId]/build/route.ts",
    "src/app/api/mobile/v1/garage/[vehicleId]/build/preview/route.ts",
    "src/app/api/mobile/v1/garage/[vehicleId]/modifications/route.ts",
    "src/app/api/mobile/v1/garage/[vehicleId]/modifications/[modificationId]/route.ts",
    "src/app/api/mobile/v1/garage/[vehicleId]/catalog-match-request/route.ts",
  ];

  for (const path of routePaths) {
    const route = source(path);
    match(route, /runtime = "nodejs"/);
    match(route, /dynamic = "force-dynamic"/);
    match(route, /authenticateMobileMember\(request\)/);
    match(route, /mobileGarageDetailErrorResponse/);
    match(route, /mobileGarageDetailJsonResponse/);
    ok(
      route.indexOf("authenticateMobileMember(request)") <
        route.indexOf("await readMobileGarageRouteId"),
    );
    ok(!/prisma\.|service_role|SUPABASE_SERVICE_ROLE/i.test(route));
    ok(!/body\.(userId|email)|requestBody\.(userId|email)/.test(route));
  }

  for (const path of [
    "src/app/api/mobile/v1/garage/[vehicleId]/image/upload-intent/route.ts",
    "src/app/api/mobile/v1/garage/[vehicleId]/image/finalize/route.ts",
  ]) {
    const route = source(path);
    ok(
      route.indexOf("authenticateMobileMember(request)") <
        route.indexOf("readMobileGarageJsonBody(request)"),
    );
  }

  const imageRoute = source(
    "src/app/api/mobile/v1/garage/[vehicleId]/image/route.ts",
  );
  ok(!/request\.formData|uploadMobileGarageVehicleImage/.test(imageRoute));

  const detailService = source("src/lib/mobile-garage-detail.ts");
  for (const guard of [
    /userId: memberUserId/,
    /deletedAt: null/,
    /updateGarageVehicle\(\{/,
    /preservePrimary: true/,
    /makePrimaryGarageVehicle\(\{/,
    /runGarageSerializableTransaction/,
    /mobileGarageBuildTransactionTimeoutMs = 15_000/,
    /needsProviderFallbackCatalog/,
    /timeoutMs: mobileGarageBuildTransactionTimeoutMs/,
    /evaluateModificationBatchAvailability/,
    /evaluateModificationRemoval/,
    /calculateProjectedVehiclePerformanceRating/,
    /validateVehicleImageFile/,
    /createSignedUploadUrl/,
    /\.info\(input\.objectPath\)/,
    /\.download\(/,
    /readOwnedVehicleImageMimeType/,
    /objectPath\.startsWith\(`\$\{memberUserId\}\/\$\{vehicleId\}\//,
  ]) {
    match(detailService, guard);
  }
  ok(!/service_role|SUPABASE_SERVICE_ROLE/i.test(detailService));
  ok(
    !/console\.(log|error)\([^)]*(accessToken|plateNumber|imagePath|email)/.test(
      detailService,
    ),
  );
  equal(mobileGarageDetailContractHeader, "X-ATS-Garage-Detail-Contract");
  equal(mobileGarageDetailContractVersion, "build-v1");
}

function rating() {
  return {
    overall: 75,
    power: 70,
    handling: 80,
    braking: 77,
    reliability: 72,
    thermal: 73,
    trackReadiness: 79,
    status: "CALIBRATED" as const,
  };
}

function installedModification() {
  return {
    id: "installed-1",
    category: "BRAKES" as const,
    categoryLabel: "Fren",
    label: "ATS / Pist Balatası",
    removal: { allowed: true, reasonCode: null, reason: null },
  };
}

function source(path: string) {
  return readFileSync(path, "utf8");
}

function ok(value: unknown) {
  assertions += 1;
  assert.ok(value);
}

function equal(actual: unknown, expected: unknown) {
  assertions += 1;
  assert.deepEqual(actual, expected);
}

function match(actual: string, expected: RegExp) {
  assertions += 1;
  assert.match(actual, expected);
}
