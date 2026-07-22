# Mobile Event Applications (`applications-v1`)

M3 exposes the existing member event-registration domain to the native app. The
web database, registration snapshots, manual-payment approval, participant-code
issuance and check-in records remain authoritative. There is no mobile-only
event, payment, pass or QR model.

## Audited Web Flow

| Website route/capability | Source | Authoritative service/entities | Member-visible data/action | Lifecycle rule | Mobile parity / deferment |
| --- | --- | --- | --- | --- | --- |
| `/`, `/events/[slug]` | `src/app/page.tsx`, event detail page | `Event`, `EventDay`, `EventPackage` | Kula event, venue, dates, package, price, capacity, apply CTA | Public page exists for the configured slug | M3 provides safe discovery/detail; photography, schedule, gallery and map remain a later public-experience phase |
| `/events/[slug]/register` | register page, `RegistrationForm` | member auth/profile, garage, registration validation | owned vehicle, experience, emergency contact, KVKK and liability confirmations | verified active member, complete profile/consents, active owned vehicle | Full native application form and review in M3 |
| `POST /api/registrations` | web registration route | shared `createMemberEventApplication`, `Registration`, `Payment`, `AuditLog` | submit once and receive status | published event, active package, deadline, capacity and duplicate checks repeat inside one serializable transaction | Web manual mode and mobile use the same transaction; iyzico-only branch remains unchanged and disabled |
| `/registration/success` | registration success page | owned registration lookup | receipt and detail link | member sees only an owned member registration | Native success navigates to the authoritative application detail; a separate decorative receipt page is deferred |
| `/account/registrations` | member history page | `Registration`, `Event`, `EventPackage` | applications, status, payment, vehicle snapshot, participant-code availability | owner scope, non-deleted registrations | Native current/history overview in M3 |
| `/account/registrations/[id]` | member detail page | registration snapshots, check-ins | event/package, vehicle, experience, emergency contact, status, payment, check-in history | foreign and missing IDs are indistinguishable | Native owner-scoped detail in M3 |
| Admin manual approval | participant admin action, `manual-payment-confirmation.ts` | serializable `Payment`, `Registration`, `CheckIn`, `AuditLog` update | no member write action | pending/unpaid only; generates participant code and one random QR token | Read-only status/pass presentation only; admin mutation remains web-only |
| Approval email | `email.ts`, `qr.ts` | raw QR token exists only during approval email generation; only its hash is stored | participant code and QR attachment | sent after authoritative confirmation | M3 displays the participant code; it states that the existing QR remains in email and never invents/reissues a QR |
| `/check-in/[token]`, admin check-in | `check-in.ts` and admin/token routes | hashed token lookup and idempotent check-in transaction | member web history is read-only | STAFF/CHECKIN/OWNER mutation only | Safe check-in history is shown; scan/check-in remains a later operator phase |
| Member cancellation/withdrawal | no supported member action found | none | none | admin rejection/archive exists, but no member cancellation contract | No endpoint or native action is created |

## Contract

Every route requires `Authorization: Bearer <access_token>`, authenticates before
reading route identifiers or bodies, runs in the Node.js runtime and returns:

```http
Cache-Control: no-store
X-ATS-Applications-Contract: applications-v1
```

401 responses also retain `WWW-Authenticate: Bearer`. Responses use the standard
`{ "error": { "code", "message" } }` envelope and never redirect to HTML/SSO.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/mobile/v1/events` | configured member-visible event and server eligibility |
| `GET` | `/api/mobile/v1/events/{slug}` | safe detail, active owned vehicle choices and confirmations |
| `POST` | `/api/mobile/v1/events/{slug}/applications` | authoritative application creation |
| `GET` | `/api/mobile/v1/applications` | authenticated member history |
| `GET` | `/api/mobile/v1/applications/{id}` | one owned application and safe check-in history |
| `GET` | `/api/mobile/v1/applications/{id}/pass` | confirmed owner's participant code and QR-delivery guidance |

The create body is an exact allowlist:

```json
{
  "vehicleId": "owned-active-vehicle-id",
  "experienceLevel": "INTERMEDIATE",
  "emergencyContactName": "Acil Durum Kişisi",
  "emergencyContactPhone": "+90 555 111 22 33",
  "kvkkAccepted": true,
  "liabilityWaiverAccepted": true
}
```

Identity, email, vehicle description/plate, event/package, price, payment state,
application status, participant code and QR data are never accepted from the
client. Unknown fields are rejected.

## Eligibility And Commit Rules

The server returns stable reasons: `EVENT_NOT_PUBLISHED`,
`REGISTRATION_NOT_OPEN`, `REGISTRATION_DEADLINE_PASSED`, `CAPACITY_REACHED`,
`PROFILE_INCOMPLETE`, `REQUIRED_CONSENTS_INCOMPLETE`, `NO_ACTIVE_VEHICLE`,
`EXISTING_APPLICATION`, `EVENT_UNAVAILABLE` and `UNKNOWN_EVENT_STATE`.

The current schema has no separate registration-deadline column. The audited
deadline is therefore the event start time; submission is rejected at or after
`startsAt`. A submission re-reads the active member/profile, published event,
active package and owned non-archived vehicle inside a serializable transaction.
Duplicate and capacity predicates are checked immediately before insert. Prisma
serialization conflicts are retried at most three times; the mutation itself is
never automatically replayed by the mobile client.

The registration stores immutable profile and vehicle snapshots. Manual mode
also creates an `INITIATED` MANUAL `Payment` in the same transaction so amount
and currency are server-selected at submission. Existing admin confirmation
updates that row and remains the only way to mark payment received/confirm the
application. Emails run after commit and cannot roll back a committed record.

## Status, Pass And Privacy

Raw Prisma status values are mapped to stable member presentation codes:
`AWAITING_MANUAL_PAYMENT`, `PAYMENT_REVIEW`, `CONFIRMED`, `REJECTED`,
`CANCELLED` and the fail-safe `STATUS_PENDING`. Online payment is never offered
while `PAYMENT_MODE=manual`.

The pass endpoint requires owner scope plus confirmed/paid state, participant
code and prior QR issuance. The current QR token cannot be recovered from its
stored hash. The endpoint therefore returns the participant code and explicitly
reports that the existing QR is in the approval email; it returns no token,
hash, check-in URL or generated replacement. Offline/stale native state hides
the participant code until the endpoint is verified again.

Responses omit member identity, admin notes, audit data, provider references,
storage paths, raw internal enums and database implementation fields. Logs use
only stable operation codes and never contain tokens, applicant identity,
phones, emergency contacts, plates, participant codes, QR values or request
bodies.

## Known Boundaries

- `PAYMENT_MODE=manual` is mandatory; iyzico activation is outside M3.
- No member cancellation/withdrawal exists on the website, so M3 does not add it.
- No in-app QR is generated because the authoritative raw token is deliberately
  not persisted. QR reissue/rotation would be a separate reviewed domain change.
- Physical application submission, admin payment mutation and QR check-in are
  prohibited during the M3 safety acceptance.
