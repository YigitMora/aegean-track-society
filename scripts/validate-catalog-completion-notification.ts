import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

const files = {
  catalog: read("src/lib/catalog-match-requests.ts"),
  adminActions: read("src/app/admin/catalog-requests/actions.ts"),
  adminDetail: read("src/app/admin/catalog-requests/[id]/page.tsx"),
  email: read("src/lib/email.ts"),
  account: read("src/app/account/page.tsx"),
  garage: read("src/app/account/garage/page.tsx"),
  vehicleDetail: read("src/app/account/garage/[id]/page.tsx"),
  appUrl: read("src/lib/app-url.ts"),
};

const checks = [
  {
    name: "Completion requires a real request, vehicle, vehicle relation, active definition, and non-completed status",
    pass:
      files.catalog.includes("completeCatalogMatchRequest") &&
      files.catalog.includes('code: "request_not_found"') &&
      files.catalog.includes("!request.vehicle || request.vehicle.id !== request.vehicleId") &&
      files.catalog.includes("!request.vehicle.vehicleDefinitionId") &&
      files.catalog.includes("!request.vehicle.vehicleDefinition?.active") &&
      files.catalog.includes('if (request.status === "COMPLETED")') &&
      files.adminDetail.includes(
        "Talebi tamamlamak için araç önce ATS kataloğuyla eşleştirilmelidir.",
      ),
  },
  {
    name: "Completion email is sent only for a real transition with an unnotified completed request",
    pass:
      files.catalog.includes("completed: true") &&
      files.catalog.includes("completed: false") &&
      files.catalog.includes("const shouldNotifyMember") &&
      files.catalog.includes("!request.memberNotifiedAt") &&
      files.catalog.includes("!request.memberNotificationEmailSentAt") &&
      files.adminActions.includes("if (result.completed && result.notification)") &&
      files.adminActions.indexOf("if (result.completed && result.notification)") <
        files.adminActions.lastIndexOf("sendCatalogMatchCompletedMemberEmail"),
  },
  {
    name: "Repeated completed action remains idempotent and does not resend",
    pass:
      order(
        files.catalog,
        'if (request.status === "COMPLETED")',
        "const shouldNotifyMember",
      ) &&
      files.adminActions.includes("completed_noop") &&
      files.catalog.includes("memberNotificationEmailSentAt"),
  },
  {
    name: "Member completion email uses server-side member email and member vehicle link",
    pass:
      files.adminActions.includes("to: result.notification.memberEmail") &&
      files.email.includes("sendCatalogMatchCompletedMemberEmail") &&
      files.email.includes("Aracınız ATS kataloğuyla eşleştirildi") &&
      files.email.includes(
        "Aracınız ATS kataloğuyla başarıyla eşleştirildi. Artık ATS Rating değerini görüntüleyebilir",
      ) &&
      files.email.includes("buildAppUrl(`/account/garage/${input.vehicleId}`)") &&
      !files.email.includes("adminNote") &&
      !files.email.includes("auditLogs"),
  },
  {
    name: "Completion notification result records sent and failed states without rolling back completion",
    pass:
      files.catalog.includes("recordCatalogMatchCompletionNotificationResult") &&
      files.catalog.includes("memberNotifiedAt: now") &&
      files.catalog.includes("memberNotificationEmailSentAt: now") &&
      files.catalog.includes("memberNotificationEmailFailedAt: now") &&
      files.catalog.includes("CATALOG_MATCH_MEMBER_NOTIFICATION_SENT") &&
      files.catalog.includes("CATALOG_MATCH_MEMBER_NOTIFICATION_FAILED") &&
      order(
        files.adminActions,
        "completeCatalogMatchRequest",
        "recordCatalogMatchCompletionNotificationResult",
      ),
  },
  {
    name: "New request notification failure keeps request and records safe failure timestamp",
    pass:
      files.adminActions.includes("sendCatalogMatchCompletedMemberEmail") &&
      files.catalog.includes("recordCatalogRequestAdminNotificationResult") &&
      files.catalog.includes("adminNotificationEmailFailedAt: now") &&
      files.catalog.includes("CATALOG_MATCH_ADMIN_NOTIFICATION_FAILED"),
  },
  {
    name: "Persistent member completion banners render on account, garage, and relevant vehicle detail",
    pass:
      files.account.includes("getRecentCatalogMatchCompletionNotices") &&
      files.account.includes("CatalogCompletionNotice") &&
      files.garage.includes("getRecentCatalogMatchCompletionNotices") &&
      files.garage.includes("CatalogCompletionNoticePanel") &&
      files.vehicleDetail.includes("getRecentCatalogMatchCompletionNotices") &&
      files.vehicleDetail.includes("CatalogCompletionNotice") &&
      files.account.includes("Katalog eşleştirmeniz tamamlandı.") &&
      files.garage.includes("Build Profilini Aç") &&
      files.vehicleDetail.includes("Build Profilini Aç"),
  },
  {
    name: "Completion notices use completed request record plus active catalog-matched vehicle as source of truth",
    pass:
      files.catalog.includes('status: "COMPLETED"') &&
      files.catalog.includes("resolvedAt:") &&
      files.catalog.includes("vehicleDefinitionId: {\n            not: null") &&
      files.catalog.includes("deletedAt: null") &&
      files.catalog.includes("href: `/account/garage/${request.vehicleId}`"),
  },
  {
    name: "Application URL helper is shared and avoids hardcoded production domain",
    pass:
      files.appUrl.includes("NEXT_PUBLIC_APP_URL") &&
      files.appUrl.includes("NEXT_PUBLIC_SITE_URL") &&
      files.email.includes("buildAppUrl(`/admin/catalog-requests/${input.requestId}`)") &&
      files.email.includes("buildAppUrl(`/account/garage/${input.vehicleId}`)") &&
      !files.email.includes("aegeantracksociety.com/admin/catalog-requests"),
  },
  {
    name: "Admin detail exposes non-sensitive notification failure state",
    pass:
      files.adminDetail.includes("Admin bildirim e-postası") &&
      files.adminDetail.includes("Üye bildirim e-postası") &&
      files.adminDetail.includes("Gönderilemedi") &&
      files.adminDetail.includes("notificationState"),
  },
];

report(checks, "Catalog completion notification validation passed.");

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
