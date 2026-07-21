import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildMobileGarageResponseBody,
  buildMobileVehicleDefinitionsResponseBody,
  hasMobileGaragePermanentDeleteConfirmation,
  mobileGarageErrorResponse,
  mobileGarageLifecycleContractHeader,
  mobileGarageLifecycleContractVersion,
  mobileGaragePermanentDeleteConfirmation,
  MobileGarageError,
  parseMobileGarageVehicleBody,
} from "../src/lib/mobile-garage-contract";
import {
  getCatalogVehicleYearOptions,
  getManualVehicleYearOptions,
  isCatalogVehicleYearAllowed,
} from "../src/lib/vehicle-year-contract";
import {
  arePlateNumbersEquivalent,
  normalizePlateNumber,
} from "../src/lib/registration-validation";

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  validateVehicleCreateBody();
  validateVehicleYearContract();
  validatePlateContract();
  validateLifecycleRequestContract();
  validateSafeResponseContracts();
  await validateStableErrorsAndHeaders();
  validateSourceGuards();

  console.log("validate-mobile-garage-api passed");
}

function validateLifecycleRequestContract() {
  assert.equal(
    hasMobileGaragePermanentDeleteConfirmation({
      confirmation: mobileGaragePermanentDeleteConfirmation,
    }),
    true,
  );

  for (const invalidBody of [
    null,
    {},
    { confirmation: true },
    { confirmation: "yes" },
    {
      confirmation: mobileGaragePermanentDeleteConfirmation,
      userId: "must-not-be-accepted",
    },
  ]) {
    assert.equal(hasMobileGaragePermanentDeleteConfirmation(invalidBody), false);
  }
}

function validatePlateContract() {
  assert.equal(normalizePlateNumber("  34   ats 123  "), "34 ATS 123");
  assert.equal(normalizePlateNumber("34 ats 123"), "34 ATS 123");
  assert.equal(normalizePlateNumber("34 ATS 123"), "34 ATS 123");
  assert.equal(normalizePlateNumber("34ats123"), "34 ATS 123");
  assert.equal(normalizePlateNumber("34 ATS123"), "34 ATS 123");
  assert.equal(normalizePlateNumber("34-ats-123"), "34 ATS 123");
  assert.equal(normalizePlateNumber("34A12345"), "34 A 12345");
  assert.equal(normalizePlateNumber("82 ATS 123"), null);
  assert.equal(normalizePlateNumber("not-a-plate"), null);
  assert.equal(arePlateNumbersEquivalent("34ats123", "34 ATS 123"), true);
  assert.equal(arePlateNumbersEquivalent("34-ats-123", "34 ATS123"), true);
  assert.equal(arePlateNumbersEquivalent("34 ATS 123", "34 ATS 124"), false);
  assert.equal(arePlateNumbersEquivalent("invalid", "also-invalid"), false);
}

function validateVehicleYearContract() {
  const bounded = { yearFrom: 2020, yearTo: 2024 };
  const current = { yearFrom: 2023, yearTo: null };

  assert.equal(isCatalogVehicleYearAllowed(2020, bounded, 2026), true);
  assert.equal(isCatalogVehicleYearAllowed(2024, bounded, 2026), true);
  assert.equal(isCatalogVehicleYearAllowed(2019, bounded, 2026), false);
  assert.equal(isCatalogVehicleYearAllowed(2025, bounded, 2026), false);
  assert.equal(isCatalogVehicleYearAllowed(2020.5, bounded, 2026), false);
  assert.equal(isCatalogVehicleYearAllowed("2020", bounded, 2026), false);
  assert.equal(isCatalogVehicleYearAllowed(null, bounded, 2026), false);
  assert.equal(
    isCatalogVehicleYearAllowed(2024, { yearFrom: null, yearTo: 2024 }, 2026),
    false,
  );
  assert.equal(
    isCatalogVehicleYearAllowed(2024, { yearFrom: 2025, yearTo: 2024 }, 2026),
    false,
  );
  assert.deepEqual(getCatalogVehicleYearOptions(bounded, 2026), {
    ok: true,
    years: [2024, 2023, 2022, 2021, 2020],
  });
  assert.deepEqual(getCatalogVehicleYearOptions(current, 2026), {
    ok: true,
    years: [2027, 2026, 2025, 2024, 2023],
  });
  assert.deepEqual(getManualVehicleYearOptions(1951), [1952, 1951, 1950]);
}

function validateVehicleCreateBody() {
  assert.deepEqual(
    parseMobileGarageVehicleBody({
      vehicleDefinitionId: "definition-1",
      brand: "  Honda ",
      model: " Civic Type R ",
      year: 2024,
      plateNumber: "34 ats 123",
      color: " Beyaz ",
      isPrimary: true,
    }),
    {
      vehicleDefinitionId: "definition-1",
      brand: "Honda",
      model: "Civic Type R",
      year: 2024,
      plateNumber: "34 ATS 123",
      color: "Beyaz",
      isPrimary: true,
    },
  );

  for (const invalidBody of [
    null,
    {},
    [],
    {
      vehicleDefinitionId: null,
      brand: "H",
      model: "Civic",
      year: null,
      plateNumber: "invalid",
      color: null,
      isPrimary: false,
    },
    {
      vehicleDefinitionId: null,
      brand: "Honda",
      model: "Civic",
      year: 2024.5,
      plateNumber: "34 ATS 123",
      color: null,
      isPrimary: false,
    },
    {
      vehicleDefinitionId: null,
      brand: "Honda",
      model: "Civic",
      year: "2024",
      plateNumber: "34 ATS 123",
      color: null,
      isPrimary: false,
    },
    {
      vehicleDefinitionId: null,
      brand: "Honda",
      model: "Civic",
      year: null,
      plateNumber: "34 ATS 123",
      color: null,
      isPrimary: false,
      userId: "must-not-be-accepted",
    },
  ]) {
    assert.equal(parseMobileGarageVehicleBody(invalidBody), null);
  }
}

function validateSafeResponseContracts() {
  const garage = buildMobileGarageResponseBody({
    active: 1,
    max: 5,
    remaining: 4,
    vehicles: [
      {
        id: "vehicle-1",
        brand: "Honda",
        model: "Civic Type R",
        year: 2024,
        plateNumber: "34 ATS 123",
        color: "Beyaz",
        isPrimary: true,
        coverImageUrl: "https://storage.example.test/signed-cover",
        vehicleDefinitionId: "definition-1",
        modificationCount: 2,
        latestCatalogMatchRequestStatus: null,
        atsRating: {
          overall: 82,
          power: 80,
          handling: 84,
          braking: 81,
          reliability: 78,
          thermal: 79,
          trackReadiness: 86,
          status: "CALIBRATED",
        },
      },
    ],
    archive: {
      archived: 1,
      max: 5,
      remaining: 4,
      vehicles: [
        {
          id: "archived-vehicle-1",
          brand: "Renault",
          model: "Megane RS",
          year: 2020,
          plateNumber: "35 ATS 456",
          modificationCount: 1,
        },
      ],
    },
  });
  const serialized = JSON.stringify(garage);

  assert.equal(garage.data.capacity.active, 1);
  assert.equal(garage.data.capacity.remaining, 4);
  assert.equal(garage.data.vehicles[0]?.atsRating?.overall, 82);
  assert.ok(garage.data.archivedCapacity);
  assert.ok(garage.data.archivedVehicles);
  assert.equal(garage.data.archivedCapacity.archived, 1);
  assert.equal(garage.data.archivedCapacity.remaining, 4);
  assert.deepEqual(Object.keys(garage.data.archivedVehicles[0] ?? {}), [
    "id",
    "brand",
    "model",
    "year",
    "plateNumber",
    "modificationCount",
  ]);
  assert.equal(serialized.includes("imagePath"), false);
  assert.equal(serialized.includes("userId"), false);
  assert.equal(serialized.includes("createdAt"), false);

  const legacyGarage = buildMobileGarageResponseBody({
    active: 0,
    max: 5,
    remaining: 5,
    vehicles: [],
  });
  assert.deepEqual(Object.keys(legacyGarage.data), ["capacity", "vehicles"]);

  const definitions = buildMobileVehicleDefinitionsResponseBody([
    {
      id: "definition-1",
      brand: "Honda",
      model: "Civic Type R",
      generation: "FL5",
      chassisCode: "FL5",
      variant: null,
      yearFrom: 2023,
      yearTo: null,
      powertrain: "ICE",
      drivetrain: "FWD",
      ratingStatus: "CALIBRATED",
    },
  ]);

  assert.deepEqual(Object.keys(definitions.data.vehicleDefinitions[0] ?? {}), [
    "id",
    "brand",
    "model",
    "generation",
    "chassisCode",
    "variant",
    "yearFrom",
    "yearTo",
    "powertrain",
    "drivetrain",
    "ratingStatus",
  ]);
}

async function validateStableErrorsAndHeaders() {
  for (const [code, status] of [
    ["MOBILE_GARAGE_INVALID_BODY", 422],
    ["MOBILE_GARAGE_DUPLICATE_PLATE", 409],
    ["MOBILE_GARAGE_CAPACITY_REACHED", 409],
    ["MOBILE_GARAGE_ARCHIVED_CAPACITY_REACHED", 409],
    ["MOBILE_GARAGE_VEHICLE_NOT_FOUND", 404],
    ["MOBILE_GARAGE_ARCHIVE_FAILED", 409],
    ["MOBILE_GARAGE_RESTORE_CONFLICT", 409],
    ["MOBILE_GARAGE_RESTORE_FAILED", 500],
    ["MOBILE_GARAGE_ACTIVE_DELETE_FORBIDDEN", 409],
    ["MOBILE_GARAGE_DELETE_CONFIRMATION_REQUIRED", 422],
    ["MOBILE_GARAGE_DELETE_FAILED", 500],
    ["MOBILE_GARAGE_CREATE_FAILED", 500],
    ["MOBILE_GARAGE_INTERNAL_ERROR", 500],
  ] as const) {
    const response = mobileGarageErrorResponse(new MobileGarageError(code));
    const body = await response.json();

    assert.equal(response.status, status);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(Object.keys(body), ["error"]);
    assert.deepEqual(Object.keys(body.error), ["code", "message"]);
    assert.equal(body.error.code, code);
    assert.equal(typeof body.error.message, "string");
  }
}

function validateSourceGuards() {
  const garageRoute = source("src/app/api/mobile/v1/garage/route.ts");
  const definitionsRoute = source(
    "src/app/api/mobile/v1/vehicle-definitions/route.ts",
  );
  const implementation = source("src/lib/mobile-garage.ts");
  const contract = source("src/lib/mobile-garage-contract.ts");
  const vehicleImages = source("src/lib/vehicle-images.ts");
  const garageService = source("src/lib/garage-service.ts");
  const plateInput = source("src/components/turkish-plate-input.tsx");
  const templateFields = source("src/components/vehicle-template-fields.tsx");
  const garagePostRoute = garageRoute.slice(
    garageRoute.indexOf("export async function POST"),
  );
  const archiveRoute = source(
    "src/app/api/mobile/v1/garage/[vehicleId]/archive/route.ts",
  );
  const restoreRoute = source(
    "src/app/api/mobile/v1/garage/[vehicleId]/restore/route.ts",
  );
  const deleteRoute = source(
    "src/app/api/mobile/v1/garage/[vehicleId]/permanent-delete/route.ts",
  );

  for (const route of [garageRoute, definitionsRoute]) {
    assert.match(route, /runtime = "nodejs"/);
    assert.match(route, /dynamic = "force-dynamic"/);
    assert.match(route, /authenticateMobileMember\(request\)/);
    assert.match(route, /mobileJsonResponse/);
    assert.doesNotMatch(route, /service_role|SUPABASE_SERVICE_ROLE|prisma\./i);
  }

  for (const [route, domainCall] of [
    [archiveRoute, "archiveMobileGarageVehicle"],
    [restoreRoute, "restoreMobileGarageVehicle"],
    [deleteRoute, "permanentlyDeleteMobileGarageVehicle"],
  ] as const) {
    assert.match(route, /runtime = "nodejs"/);
    assert.match(route, /dynamic = "force-dynamic"/);
    assert.match(route, /authenticateMobileMember\(request\)/);
    assert.match(route, new RegExp(`${domainCall}\\(\\{`));
    assert.match(route, /memberUserId: memberUser\.id/);
    assert.match(route, /mobileJsonResponse/);
    assert.doesNotMatch(route, /body\.userId|body\.email|prisma\./);
    assert.ok(
      route.indexOf("authenticateMobileMember(request)") <
        route.indexOf(`${domainCall}({`),
    );
  }

  assert.match(deleteRoute, /export async function DELETE/);
  assert.match(deleteRoute, /readRequestBody\(request\)/);
  assert.match(deleteRoute, /MOBILE_GARAGE_DELETE_CONFIRMATION_REQUIRED/);

  assert.ok(
    garageRoute.indexOf("authenticateMobileMember(request)") <
      garageRoute.indexOf("getMobileGarageResponseBody("),
  );
  assert.match(plateInput, /defaultValue=\{defaultValue \?\? ""\}/);
  assert.match(plateInput, /autoCapitalize="none"/);
  assert.doesNotMatch(plateInput, /onChange|toUpperCase|normalizeTurkishPlateInput/);
  assert.match(templateFields, /getManualVehicleYearOptions/);
  assert.match(templateFields, /<SelectField\s+label="Model yılı"/);
  assert.doesNotMatch(templateFields, /label="Model yılı"[\s\S]{0,120}type="number"/);
  assert.match(garageService, /plateNumber: vehicleInput\.plateNumber/);
  assert.match(garageService, /findActiveVehicleByPlate\(\{/);
  assert.match(garageService, /arePlateNumbersEquivalent\(vehicle\.plateNumber, plateNumber\)/);
  assert.match(
    garageRoute,
    /getMobileGarageResponseBody\(memberUser\.id, accessToken, \{/,
  );
  assert.ok(
    garagePostRoute.indexOf("authenticateMobileMember(request)") <
      garagePostRoute.indexOf("createMobileGarageVehicle({"),
  );
  assert.ok(
    definitionsRoute.indexOf("authenticateMobileMember(request)") <
      definitionsRoute.indexOf("getMobileVehicleDefinitionsResponseBody()"),
  );

  assert.match(implementation, /userId: memberUserId/);
  assert.match(implementation, /deletedAt: null/);
  assert.match(implementation, /calculateVehiclePerformanceRating/);
  assert.match(implementation, /createOwnedVehicleImageSignedUrl/);
  assert.match(implementation, /accessToken/);
  assert.match(implementation, /createGarageVehicle\(\{/);
  assert.match(implementation, /targetUserId: memberUserId/);
  assert.match(implementation, /MOBILE_GARAGE_IMAGE_SIGN_FAILED/);
  assert.match(implementation, /isPrimary: "desc"/);
  assert.match(implementation, /deletedAt: "desc"/);
  assert.match(implementation, /serializeMobileArchivedGarageVehicle/);
  assert.match(
    implementation,
    /plateNumber: normalizePlateNumber\(vehicle\.plateNumber\) \?\? vehicle\.plateNumber/g,
  );
  assert.match(implementation, /archiveGarageVehicles\(\{/);
  assert.match(implementation, /restoreGarageVehicle\(\{/);
  assert.match(implementation, /permanentlyDeleteArchivedGarageVehicles\(\{/);
  assert.match(implementation, /deleteOwnedVehicleImageObjects\(\{/);
  assert.match(implementation, /targetUserId: memberUserId/);
  assert.match(garageRoute, /mobileGarageLifecycleContractHeader/);
  assert.match(garageRoute, /mobileGarageLifecycleContractVersion/);
  assert.equal(mobileGarageLifecycleContractHeader, "X-ATS-Garage-Contract");
  assert.equal(mobileGarageLifecycleContractVersion, "lifecycle-v1");
  assert.doesNotMatch(
    implementation.slice(
      implementation.indexOf("function serializeMobileArchivedGarageVehicle"),
    ),
    /coverImageUrl|createOwnedVehicleImageSignedUrl/,
  );
  assert.doesNotMatch(implementation, /body\.userId|body\.email/);
  assert.doesNotMatch(contract, /imagePath/);
  assert.doesNotMatch(contract, /accessToken/);
  assert.doesNotMatch(contract, /service_role|SUPABASE_SERVICE_ROLE/i);
  assert.match(vehicleImages, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(vehicleImages, /persistSession: false/);
  assert.match(vehicleImages, /path\.startsWith\(userPathPrefix\)/);
  assert.match(vehicleImages, /mobile_permanent_delete_cleanup/);
  assert.doesNotMatch(vehicleImages, /console\.(warn|error)\([^\n]*accessToken/);
  assert.match(garageService, /isolationLevel: Prisma\.TransactionIsolationLevel\.Serializable/);
  assert.match(garageService, /error\.code === "P2034"/);
  assert.match(garageService, /registration\.updateMany\(\{/);
  assert.match(garageService, /vehicleId: null/);
  assert.match(garageService, /preservedRegistrationSnapshots/);
  assert.match(garageService, /vehicleModification\.deleteMany\(\{/);
  assert.match(garageService, /active_delete_forbidden/);
  assert.match(garageService, /restore_conflict/);
  assert.match(garageService, /archived_vehicle_limit_reached/);
  assert.match(garageService, /primary_reassignment/);
  assert.match(garageService, /isCatalogVehicleYearAllowed\(year, definition\)/);
  assert.match(garageService, /id: input\.vehicleDefinitionId/);
  assert.match(garageService, /if \(!definition \|\| !input\.year/);
  assert.ok(
    garageService.indexOf("resolveVehicleInputForWrite(tx, input)") <
      garageService.indexOf("const vehicle = await tx.vehicle.create"),
  );
}

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
