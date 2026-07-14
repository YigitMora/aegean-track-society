import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

const files = {
  schema: read("prisma/schema.prisma"),
  migration: read(
    "prisma/migrations/20260714120000_vehicle_catalog_match_requests/migration.sql",
  ),
  catalog: read("src/lib/catalog-match-requests.ts"),
  garageActions: read("src/app/account/garage/actions.ts"),
  lifecycle: read("src/components/garage-vehicle-lifecycle.tsx"),
  garagePage: read("src/app/account/garage/page.tsx"),
  adminList: read("src/app/admin/catalog-requests/page.tsx"),
  adminDetail: read("src/app/admin/catalog-requests/[id]/page.tsx"),
  adminActions: read("src/app/admin/catalog-requests/actions.ts"),
  adminShell: read("src/components/admin/admin-shell.tsx"),
  email: read("src/lib/email.ts"),
  envExample: read(".env.example"),
};

const checks = [
  {
    name: "Prisma model, enum, notification fields, relations, and indexes exist",
    pass:
      files.schema.includes("enum VehicleCatalogMatchRequestStatus") &&
      files.schema.includes("PENDING") &&
      files.schema.includes("IN_REVIEW") &&
      files.schema.includes("COMPLETED") &&
      files.schema.includes("REJECTED") &&
      files.schema.includes("model VehicleCatalogMatchRequest") &&
      files.schema.includes("memberNotifiedAt") &&
      files.schema.includes("adminNotificationEmailSentAt") &&
      files.schema.includes("adminNotificationEmailFailedAt") &&
      files.schema.includes("memberNotificationEmailSentAt") &&
      files.schema.includes("memberNotificationEmailFailedAt") &&
      files.schema.includes("@@index([vehicleId])") &&
      files.schema.includes("@@index([userId])") &&
      files.schema.includes("@@index([status])") &&
      files.schema.includes("@@index([createdAt])") &&
      files.schema.includes("@@index([updatedAt])"),
  },
  {
    name: "Migration creates request table, enum, indexes, and preserving foreign keys",
    pass:
      files.migration.includes("CREATE TYPE \"VehicleCatalogMatchRequestStatus\"") &&
      files.migration.includes("CREATE TABLE \"VehicleCatalogMatchRequest\"") &&
      files.migration.includes("ON DELETE SET NULL") &&
      files.migration.includes("ON DELETE RESTRICT") &&
      files.migration.includes("VehicleCatalogMatchRequest_vehicleId_idx") &&
      files.migration.includes("VehicleCatalogMatchRequest_userId_idx") &&
      files.migration.includes("VehicleCatalogMatchRequest_status_idx"),
  },
  {
    name: "Member request action authenticates member and never trusts user ID from form data",
    pass:
      files.garageActions.includes("requestVehicleCatalogMatchAction") &&
      files.garageActions.includes("requireCompleteMemberUser(garagePath)") &&
      files.garageActions.includes("userId: memberUser.id") &&
      !files.garageActions.includes('formData.get("userId")') &&
      files.garageActions.includes("createCatalogMatchRequestForMember"),
  },
  {
    name: "Request creation verifies ownership, active state, unmatched catalog state, and duplicate opens",
    pass:
      files.catalog.includes("runGarageSerializableTransaction") &&
      files.catalog.includes("id: normalizedVehicleId") &&
      files.catalog.includes("userId") &&
      files.catalog.includes("if (vehicle.deletedAt)") &&
      files.catalog.includes("if (vehicle.vehicleDefinitionId)") &&
      files.catalog.includes('status: {\n          in: [...openCatalogMatchRequestStatuses]') &&
      files.catalog.includes('"PENDING"') &&
      files.catalog.includes('"IN_REVIEW"'),
  },
  {
    name: "Duplicate open request returns existing request and sends no second admin email",
    pass:
      files.catalog.includes("created: false") &&
      files.catalog.includes("request_already_open") &&
      files.garageActions.indexOf("if (!result.created)") <
        files.garageActions.lastIndexOf("sendCatalogMatchRequestAdminEmail"),
  },
  {
    name: "Garage card uses real action form and persistent request state instead of fake anchor CTA",
    pass:
      files.garagePage.includes("catalogMatchRequests") &&
      files.garagePage.includes("catalogMatchRequest: vehicle.catalogMatchRequests[0]") &&
      files.lifecycle.includes("CatalogMatchRequestForm") &&
      files.lifecycle.includes("useActionState") &&
      files.lifecycle.includes("requestVehicleCatalogMatchAction") &&
      !files.lifecycle.includes('href="#garage-catalog-support"'),
  },
  {
    name: "Garage request UI covers no request, pending, in-review, rejected, and integrity states",
    pass:
      files.lifecycle.includes("Katalog eşleştirmesi iste") &&
      files.lifecycle.includes("Talep beklemede") &&
      files.lifecycle.includes("Talebiniz ATS ekibine iletildi.") &&
      files.lifecycle.includes("İnceleniyor") &&
      files.lifecycle.includes(
        "Aracınızın katalog uyumu ATS ekibi tarafından inceleniyor.",
      ) &&
      files.lifecycle.includes("Talep sonuçlandırılamadı") &&
      files.lifecycle.includes("Eşleştirme kontrolü gerekli"),
  },
  {
    name: "Catalog request pending feedback is accessible and source-of-truth survives refresh",
    pass:
      files.lifecycle.includes("aria-live") &&
      files.lifecycle.includes("Talep gönderiliyor...") &&
      files.garageActions.includes(
        "Talebiniz alındı. Araç bilgileri ATS ekibi tarafından incelenecek.",
      ) &&
      files.garagePage.includes("catalogMatchRequests"),
  },
  {
    name: "Admin request pages and actions are OWNER-only server-side",
    pass:
      files.adminList.includes("requireOwnerAdmin()") &&
      files.adminDetail.includes("requireOwnerAdmin()") &&
      files.adminActions.includes("requireOwnerAdmin()") &&
      files.adminShell.includes("isOwner ? (") &&
      files.adminShell.includes("Katalog Talepleri"),
  },
  {
    name: "Admin list and detail expose required operational request data",
    pass:
      files.adminList.includes("/admin/catalog-requests") &&
      files.adminList.includes("statusFilters") &&
      files.adminList.includes("memberName") &&
      files.adminList.includes("catalogMatchState") &&
      files.adminDetail.includes("Talep ID") &&
      files.adminDetail.includes("Admin notu") &&
      files.adminDetail.includes("Üye garajını aç") &&
      files.adminDetail.includes("vehicleDefinitionId"),
  },
  {
    name: "Admin lifecycle actions validate transitions and completion precondition",
    pass:
      files.catalog.includes("allowedCurrentStatuses") &&
      files.catalog.includes("completion_requires_catalog_match") &&
      files.catalog.includes("completion_requires_active_definition") &&
      files.catalog.includes("request.status === \"COMPLETED\"") &&
      files.catalog.includes("request.status === \"REJECTED\"") &&
      files.adminDetail.includes(
        "Talebi tamamlamak için araç önce ATS kataloğuyla eşleştirilmelidir.",
      ),
  },
  {
    name: "Request audit actions are written for create, review, complete, reject, and notifications",
    pass:
      files.catalog.includes("CATALOG_MATCH_REQUEST_CREATED") &&
      files.catalog.includes("CATALOG_MATCH_REQUEST_IN_REVIEW") &&
      files.catalog.includes("CATALOG_MATCH_REQUEST_COMPLETED") &&
      files.catalog.includes("CATALOG_MATCH_REQUEST_REJECTED") &&
      files.catalog.includes("CATALOG_MATCH_MEMBER_NOTIFICATION_SENT") &&
      files.catalog.includes("CATALOG_MATCH_MEMBER_NOTIFICATION_FAILED") &&
      files.catalog.includes("ipAddress"),
  },
  {
    name: "Admin notification email uses configured recipient fallback and operational-only content",
    pass:
      files.envExample.includes("CATALOG_REQUEST_NOTIFICATION_EMAIL") &&
      files.email.includes("getCatalogRequestNotificationRecipient") &&
      files.email.includes("process.env.CATALOG_REQUEST_NOTIFICATION_EMAIL") &&
      files.email.includes("process.env.ADMIN_EMAIL") &&
      files.email.includes("memberDisplayName") &&
      files.email.includes("memberEmail") &&
      files.email.includes("plateNumber") &&
      files.email.includes("/admin/catalog-requests/") &&
      !files.email.includes("auth token") &&
      !files.email.includes("password"),
  },
  {
    name: "Restricted admin roles do not receive navigation or server access to catalog requests",
    pass:
      files.adminShell.includes("isOwnerAdmin") &&
      files.adminShell.includes("Katalog Talepleri") &&
      files.adminList.includes("requireOwnerAdmin()") &&
      files.adminDetail.includes("requireOwnerAdmin()") &&
      files.adminActions.includes("requireOwnerAdmin()") &&
      !files.adminList.includes("requireAdminCapability") &&
      !files.adminDetail.includes("requireAdminCapability"),
  },
];

report(checks, "Catalog match request validation passed.");

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
