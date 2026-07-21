import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildMobileGarageResponseBody,
  buildMobileVehicleDefinitionsResponseBody,
  mobileGarageErrorResponse,
  MobileGarageError,
  parseMobileGarageVehicleBody,
} from "../src/lib/mobile-garage-contract";

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  validateVehicleCreateBody();
  validateSafeResponseContracts();
  await validateStableErrorsAndHeaders();
  validateSourceGuards();

  console.log("validate-mobile-garage-api passed");
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
  });
  const serialized = JSON.stringify(garage);

  assert.equal(garage.data.capacity.active, 1);
  assert.equal(garage.data.capacity.remaining, 4);
  assert.equal(garage.data.vehicles[0]?.atsRating?.overall, 82);
  assert.equal(serialized.includes("imagePath"), false);
  assert.equal(serialized.includes("userId"), false);
  assert.equal(serialized.includes("createdAt"), false);

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
  const garagePostRoute = garageRoute.slice(
    garageRoute.indexOf("export async function POST"),
  );

  for (const route of [garageRoute, definitionsRoute]) {
    assert.match(route, /runtime = "nodejs"/);
    assert.match(route, /dynamic = "force-dynamic"/);
    assert.match(route, /authenticateMobileMember\(request\)/);
    assert.match(route, /mobileJsonResponse/);
    assert.doesNotMatch(route, /service_role|SUPABASE_SERVICE_ROLE|prisma\./i);
  }

  assert.ok(
    garageRoute.indexOf("authenticateMobileMember(request)") <
      garageRoute.indexOf(
        "getMobileGarageResponseBody(memberUser.id, accessToken)",
      ),
  );
  assert.match(
    garageRoute,
    /getMobileGarageResponseBody\(memberUser\.id, accessToken\)/,
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
  assert.doesNotMatch(implementation, /body\.userId|body\.email/);
  assert.doesNotMatch(contract, /imagePath/);
  assert.doesNotMatch(contract, /accessToken/);
  assert.doesNotMatch(contract, /service_role|SUPABASE_SERVICE_ROLE/i);
  assert.match(vehicleImages, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(vehicleImages, /persistSession: false/);
  assert.doesNotMatch(vehicleImages, /console\.(warn|error)\([^\n]*accessToken/);
}

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
