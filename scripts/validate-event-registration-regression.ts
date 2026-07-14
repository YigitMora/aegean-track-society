import { assertCondition, readRepoFile } from "./catalog-source-utils";

const eventPage = readRepoFile("src/app/events/[slug]/page.tsx");
const registerPage = readRepoFile("src/app/events/[slug]/register/page.tsx");
const registrationForm = readRepoFile("src/components/registration-form.tsx");
const registrationApi = readRepoFile("src/app/api/registrations/route.ts");

assertCondition(
  eventPage.includes("const registerHref = `/events/${event.slug}/register`;"),
  "event page must keep the existing registration route",
);
assertCondition(
  eventPage.includes("href={registerHref}") &&
    !eventPage.includes("RegistrationForm") &&
    !eventPage.includes("/api/registrations"),
  "event detail page must not inline or replace registration behavior",
);
assertCondition(
  registerPage.includes("RegistrationForm") &&
    registerPage.includes("ensureMemberUser") &&
    registerPage.includes("getVerifiedSupabaseUser") &&
    registerPage.includes('export const dynamic = "force-dynamic"'),
  "registration page must retain member-gated dynamic form behavior",
);
assertCondition(
  registrationForm.includes('fetch("/api/registrations"') &&
    registrationForm.includes("emergencyContactName") &&
    registrationForm.includes("defaultVehicleId"),
  "registration form must still submit existing payload fields",
);
assertCondition(
  registrationApi.includes('const eventSlug = "kula-mytrack-2026";') &&
    registrationApi.includes('const packageCode = "SEP20";') &&
    registrationApi.includes("manualReservationMessage") &&
    registrationApi.includes("capacity_check"),
  "registration API must retain existing event/package/capacity behavior",
);

console.log("PASS event detail links to existing registration route");
console.log("PASS registration page remains dynamic and member-gated");
console.log("PASS registration form and API behavior remain in place");
