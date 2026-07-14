import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

const files = {
  actions: read("src/app/account/garage/actions.ts"),
  service: read("src/lib/garage-service.ts"),
  submitButton: read("src/components/vehicle-submit-button.tsx"),
  form: read("src/components/vehicle-form.tsx"),
  newPage: read("src/app/account/garage/new/page.tsx"),
  garagePage: read("src/app/account/garage/page.tsx"),
  detailPage: read("src/app/account/garage/[id]/page.tsx"),
  capacity: read("src/lib/garage-capacity.ts"),
};

const checks = [
  {
    name: "Vehicle submit button uses form pending state, disables submit, and exposes aria-busy",
    pass:
      files.submitButton.includes("useFormStatus") &&
      files.submitButton.includes("disabled={pending}") &&
      files.submitButton.includes("aria-busy={pending}") &&
      files.submitButton.includes("pending ? pendingLabel : children") &&
      files.form.includes("VehicleSubmitButton") &&
      files.newPage.includes('pendingSubmitLabel="Araç ekleniyor..."'),
  },
  {
    name: "First valid vehicle create redirects to the created vehicle detail page with success state",
    pass:
      files.actions.includes("createVehicleAction") &&
      files.actions.includes("redirectPath") &&
      files.actions.includes("`${garagePath}/${result.vehicleId}?garage=created`") &&
      files.actions.includes("redirect(redirectPath)") &&
      files.detailPage.includes("Araç garajınıza eklendi."),
  },
  {
    name: "Recoverable duplicate create redirects to the member-owned existing vehicle",
    pass:
      files.service.includes("existingVehicleId?: string") &&
      files.service.includes('garageFailure("duplicate_plate", {\n        existingVehicleId') &&
      files.actions.includes('result.code === "duplicate_plate" && result.existingVehicleId') &&
      files.actions.includes(
        "`${garagePath}/${result.existingVehicleId}?garage=duplicate_opened`",
      ) &&
      files.detailPage.includes(
        "Bu araç zaten garajınızda. Mevcut araç kaydı açıldı.",
      ) &&
      files.garagePage.includes(
        "Bu araç zaten garajınızda. Mevcut araç kaydı açıldı.",
      ),
  },
  {
    name: "Duplicate lookup is scoped to the authenticated member and active normalized vehicle identity",
    pass:
      files.service.includes("userId: targetUserId") &&
      files.service.includes("plateNumber: vehicleInput.plateNumber") &&
      files.service.includes("deletedAt: null") &&
      order(files.service, "const duplicateVehicle", "const vehicle = await tx.vehicle.create"),
  },
  {
    name: "Server-side idempotency keeps capacity and duplicate checks inside serializable transaction",
    pass:
      files.service.includes("runGarageSerializableTransaction") &&
      files.service.includes("Prisma.TransactionIsolationLevel.Serializable") &&
      files.service.includes("const activeVehicleCount = await tx.vehicle.count") &&
      files.service.includes("canAddActiveVehicle(activeVehicleCount)") &&
      order(files.service, "const activeVehicleCount", "const duplicateVehicle") &&
      order(files.service, "const duplicateVehicle", "const activePrimaryCount") &&
      order(files.service, "const activePrimaryCount", "tx.vehicle.create"),
  },
  {
    name: "Redirect exceptions are not swallowed by create action error handling",
    pass:
      files.actions.includes("isRedirectError(error)") &&
      files.actions.includes("throw error") &&
      order(files.actions, "try {\n    const result = await createGarageVehicle", "revalidateGarage();") &&
      order(files.actions, "revalidateGarage();", "redirect(redirectPath)") &&
      files.actions.includes("redirectWithError(\"/account/garage/new\", \"failed\")"),
  },
  {
    name: "True validation and capacity errors remain distinct and localized",
    pass:
      files.newPage.includes("Garaj kapasiteniz dolu.") &&
      files.garagePage.includes("Garaj kapasiteniz dolu.") &&
      files.newPage.includes("Lütfen marka, model, plaka ve opsiyonel alanları kontrol edin.") &&
      files.capacity.includes("MAX_ACTIVE_GARAGE_VEHICLES = 5") &&
      files.service.includes("active_vehicle_limit_reached"),
  },
  {
    name: "Vehicle creation preserves primary-vehicle behavior and audit logging",
    pass:
      files.service.includes("activePrimaryCount") &&
      files.service.includes("shouldBecomePrimary") &&
      files.service.includes("isPrimary: false") &&
      files.service.includes("ADMIN_GARAGE_VEHICLE_CREATED") &&
      files.service.includes("snapshotVehicle(vehicle)"),
  },
  {
    name: "Creation form no longer needs fragile local pending booleans",
    pass:
      !files.form.includes("useState") &&
      !files.newPage.includes("useState") &&
      files.submitButton.includes("useFormStatus"),
  },
  {
    name: "User never remains on the create form for recoverable duplicate after successful prior create",
    pass:
      order(files.actions, 'result.code === "duplicate_plate"', "redirectPath =") &&
      files.actions.includes("redirect(redirectPath)") &&
      !files.actions.includes('redirectWithError("/account/garage/new", "duplicate_plate")'),
  },
];

report(checks, "Vehicle create UX and idempotency validation passed.");

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

function order(source: string, first: string, second: string) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);

  return firstIndex >= 0 && secondIndex >= 0 && firstIndex < secondIndex;
}

function report(checksToReport: Array<{ name: string; pass: boolean }>, message: string) {
  const failedChecks = checksToReport.filter((check) => !check.pass);

  for (const check of checksToReport) {
    console.log(`${check.pass ? "PASS" : "FAIL"} ${check.name}`);
  }

  assert.equal(
    failedChecks.length,
    0,
    failedChecks.map((check) => check.name).join(", "),
  );
  console.log(message);
}
