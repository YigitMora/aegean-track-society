# Mobile API Authentication

The public iOS app authenticates to versioned mobile API routes with a Supabase
access token. The web browser cookie/session flow remains separate and continues
to use the existing Supabase SSR helpers and middleware.

## Request Authentication

Send the Supabase access token in the HTTP `Authorization` header:

```http
Authorization: Bearer <access_token>
```

Mobile clients must not send a user id or email address for authentication.
The API validates the bearer token with Supabase on the server, then maps the
verified Supabase user to the Prisma `User` record. Prisma/PostgreSQL access
stays server-side only.

The mobile API does not require or use Supabase service-role credentials.

## `GET /api/mobile/v1/me`

Returns the minimum account/profile data needed to bootstrap the mobile app.
Every success and error response includes `Cache-Control: no-store`. Authentication
failures with HTTP 401 also include `WWW-Authenticate: Bearer`.

### Example Request

```bash
curl \
  -H "Authorization: Bearer eyJhbGciOi..." \
  https://www.aegeantracksociety.com/api/mobile/v1/me
```

### Success Response

```json
{
  "data": {
    "member": {
      "id": "4e59e2e2-8c1e-4fd3-a7f6-9d8b9d4a6f52",
      "email": "member@example.com"
    },
    "profileComplete": true,
    "requiredConsentsComplete": true,
    "marketingConsent": false,
    "profile": {
      "fullName": "Ada Yılmaz",
      "displayName": "Ada",
      "phone": "+90 555 123 45 67"
    }
  }
}
```

The endpoint intentionally omits admin data, service credentials, password
state, event applications, payment data, garage vehicles, emergency contact
details, raw consent timestamps, Supabase metadata, tokens, internal account
status, and database timestamps.

## Error Contract

All mobile auth errors use the same envelope:

```json
{
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Güvenli Türkçe kullanıcı mesajı"
  }
}
```

Current auth error codes:

| Code | HTTP | Meaning |
| --- | ---: | --- |
| `MOBILE_AUTH_MISSING_TOKEN` | 401 | `Authorization` header is missing. |
| `MOBILE_AUTH_INVALID_FORMAT` | 401 | Header is not exactly `Bearer <access_token>`. |
| `MOBILE_AUTH_INVALID_TOKEN` | 401 | Supabase could not validate the token. |
| `MOBILE_AUTH_EXPIRED_TOKEN` | 401 | Token has expired. |
| `MOBILE_AUTH_EMAIL_UNVERIFIED` | 403 | Supabase user email is not verified. |
| `MOBILE_AUTH_ACCOUNT_SUSPENDED` | 403 | Prisma member account is suspended. |
| `MOBILE_AUTH_ACCOUNT_UNAVAILABLE` | 403 | Prisma member account is deleted or unavailable. |
| `MOBILE_AUTH_CONFIGURATION_ERROR` | 503 | Required server auth configuration is missing. |
| `MOBILE_AUTH_BACKEND_UNAVAILABLE` | 503 | Supabase Auth is temporarily unreachable or failed. |
| `MOBILE_AUTH_PROVISIONING_FAILED` | 500 | Prisma member provisioning/mapping failed. |
| `MOBILE_AUTH_INTERNAL_ERROR` | 500 | Unexpected server error. |

Example expired-token response:

```json
{
  "error": {
    "code": "MOBILE_AUTH_EXPIRED_TOKEN",
    "message": "Oturum süreniz doldu. Lütfen tekrar giriş yapın."
  }
}
```

## Required Environment Variables

The mobile API uses the same public Supabase configuration as member web auth:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
DATABASE_URL="postgresql://..."
```

`PAYMENT_MODE=manual` remains unchanged and is not part of mobile API
authentication.

Do not configure a Supabase service-role key for the public mobile app.

## Garage Lifecycle API

All garage routes use the same bearer authentication, `Cache-Control: no-store`
response policy, authenticated Prisma member mapping, and owner scoping described
above. A request never accepts a user id or email address.

### Read Garage

`GET /api/mobile/v1/garage` preserves the existing active garage contract and
adds the archive contract when the M2C client sends:

```http
X-ATS-Garage-Contract: lifecycle-v1
```

Existing clients that omit this header continue to receive exactly the original
`capacity` and `vehicles` fields. This negotiation is required because the
existing mobile response validator intentionally rejects unknown fields.

```json
{
  "data": {
    "capacity": { "active": 1, "max": 5, "remaining": 4 },
    "vehicles": [],
    "archivedCapacity": { "archived": 1, "max": 5, "remaining": 4 },
    "archivedVehicles": [
      {
        "id": "vehicle-id",
        "brand": "Honda",
        "model": "Civic Type R",
        "year": 2024,
        "plateNumber": "34 ATS 123",
        "modificationCount": 2
      }
    ]
  }
}
```

Archived vehicles are ordered by archive time descending and then by id. The
archive representation intentionally omits signed image URLs, rating details,
primary state, internal timestamps, storage paths, owner ids, and registration
data.

### Mutations

| Operation | Method and route | Body |
| --- | --- | --- |
| Archive | `POST /api/mobile/v1/garage/{vehicleId}/archive` | none |
| Restore | `POST /api/mobile/v1/garage/{vehicleId}/restore` | none |
| Permanently delete | `DELETE /api/mobile/v1/garage/{vehicleId}/permanent-delete` | `{ "confirmation": "PERMANENT_DELETE" }` |

Each successful mutation returns the same complete `data` object as the garage
GET endpoint so the client renders the server-selected primary vehicle and
capacities without predicting them locally. Permanent deletion is restricted to
archived vehicles. It unlinks registrations while preserving their immutable
vehicle snapshots and deletes vehicle modifications in the existing serializable
database transaction. Image-object deletion runs after commit; storage cleanup
failure is logged without exposing paths or credentials and does not misreport a
committed database deletion as failed.

### Garage Error Codes

Garage errors use the standard mobile error envelope.

| Code | HTTP | Meaning |
| --- | ---: | --- |
| `MOBILE_GARAGE_VEHICLE_NOT_FOUND` | 404 | Vehicle is absent, belongs to another member, or is not in the required state. |
| `MOBILE_GARAGE_CAPACITY_REACHED` | 409 | Active garage capacity is full. |
| `MOBILE_GARAGE_ARCHIVED_CAPACITY_REACHED` | 409 | Archive capacity is full. |
| `MOBILE_GARAGE_RESTORE_CONFLICT` | 409 | An active vehicle has the same canonical plate. |
| `MOBILE_GARAGE_ARCHIVE_FAILED` | 409 | Archive state changed or the operation could not be completed. |
| `MOBILE_GARAGE_ACTIVE_DELETE_FORBIDDEN` | 409 | Permanent delete was attempted for an active vehicle. |
| `MOBILE_GARAGE_DELETE_CONFIRMATION_REQUIRED` | 422 | Exact destructive confirmation is missing. |
| `MOBILE_GARAGE_RESTORE_FAILED` | 500 | Restore failed unexpectedly. |
| `MOBILE_GARAGE_DELETE_FAILED` | 500 | Permanent delete failed unexpectedly. |

## Garage Detail and Build API

M2D adds owner-scoped detail, media, matching and build routes. All routes use
the bearer authentication and error envelope above, run in the Node.js runtime,
and return `Cache-Control: no-store`. M2D clients send the capability header and
the API echoes the selected contract on every success/error response:

```http
X-ATS-Garage-Detail-Contract: build-v1
```

The route handler authenticates before reading a route id or JSON body.
Vehicle ownership is always derived from the authenticated
Prisma member. A missing vehicle and a vehicle owned by another member produce
the same non-leaking `MOBILE_GARAGE_VEHICLE_NOT_FOUND` response.

### Endpoints

| Method | Route | Request | Success |
| --- | --- | --- | --- |
| `GET` | `/api/mobile/v1/garage/{vehicleId}` | none | Safe vehicle detail |
| `PATCH` | `/api/mobile/v1/garage/{vehicleId}` | Editable vehicle fields | `{ "data": { "vehicleId": "..." } }` |
| `POST` | `/api/mobile/v1/garage/{vehicleId}/primary` | none | Mutation response |
| `POST` | `/api/mobile/v1/garage/{vehicleId}/image/upload-intent` | MIME and byte size | Short-lived upload capability |
| `POST` | `/api/mobile/v1/garage/{vehicleId}/image/finalize` | Server-issued object path | Mutation response |
| `DELETE` | `/api/mobile/v1/garage/{vehicleId}/image` | none | Mutation response |
| `GET` | `/api/mobile/v1/garage/{vehicleId}/build` | none | Build and catalog |
| `POST` | `/api/mobile/v1/garage/{vehicleId}/build/preview` | Modification definition ids | Current/projected rating |
| `POST` | `/api/mobile/v1/garage/{vehicleId}/modifications` | Modification definition ids | Mutation response, HTTP 201 |
| `DELETE` | `/api/mobile/v1/garage/{vehicleId}/modifications/{modificationId}` | none | Mutation response |
| `POST` | `/api/mobile/v1/garage/{vehicleId}/catalog-match-request` | Optional member note | Mutation response, HTTP 201 |

Vehicle edit accepts exactly these fields and rejects extra ownership, primary,
rating, image and registration fields:

```json
{
  "vehicleDefinitionId": "definition-id-or-null",
  "brand": "Ford",
  "model": "Focus RS",
  "year": 2017,
  "plateNumber": "34 ATS 123",
  "color": "Mavi"
}
```

`vehicleDefinitionId: null` is the supported manual-identity/platform-unlink
path. Plate normalization, duplicate protection and compatibility checks use
the existing garage domain service. Primary state is not accepted from this
body and is preserved from the vehicle row inside the serializable update
transaction. Primary changes use the dedicated primary endpoint.

The detail response contains only the editable identity fields, primary/archive
flags, a short-lived signed cover URL, image constraints, safe catalog-match
state, rating components, installed modification summaries and server-computed
action capabilities. It omits storage object paths, owner ids, email addresses,
registration rows/snapshots, admin notes and database timestamps.

### Media Contract

The web and mobile products share one optional cover image. Upload replaces the
previous cover; delete restores the normal fallback image. Multiple images,
ordering and focal-point metadata are not present in the current web domain.

- accepted signatures and MIME types: JPEG, PNG and WebP
- maximum size: 8 MiB
- upload intent body: `{ "mimeType": "image/jpeg", "fileSize": 1048576 }`
- upload intent response: `{ "data": { "upload": { "objectPath": "...", "token": "..." } } }`
- the short-lived token is a single-object Storage upload capability and must
  be treated as sensitive; it is never logged or persisted by the app
- object path: generated by the server under the authenticated member and
  vehicle prefix; finalize rejects paths outside that exact owner/vehicle and
  UUID filename shape
- upload order: authenticate and authorize intent, upload directly to Supabase
  Storage, authenticate finalize, inspect stored metadata, download and verify
  the signature, conditionally update the vehicle, then best-effort cleanup of
  the previous object
- remove order: conditionally clear the database reference, then best-effort
  cleanup of the previously referenced object

The image bytes do not pass through a Vercel Function request body, so the
8 MiB product limit remains valid despite the platform's smaller function-body
limit. Finalize checks Storage-reported size and MIME before downloading, then
verifies the downloaded size and file signature. The backend remains
authoritative even when the mobile picker has already checked metadata.
Cleanup failures are logged only as stable operation codes and cannot turn a
committed database mutation into a reported rollback. A client that uploads
successfully but never calls finalize can leave an unreferenced object; periodic
or operational orphan cleanup is deferred and must remain owner-prefix scoped.

### Build and Rating Contract

Build requests accept only unique modification-definition ids, with at most 20
ids per preview/add request:

```json
{ "modificationDefinitionIds": ["definition-a", "definition-b"] }
```

Catalog status is one of `AVAILABLE`, `INSTALLED`, `BLOCKED`, `INCOMPATIBLE` or
`UNKNOWN`. Each entry includes a stable reason code, safe explanation,
conflicting installed part where applicable, prerequisite alternatives and
calibration/provisional disclosure. The authoritative transaction rechecks
active status, compatibility, slots, exclusivity, duplicates, conflicts and
prerequisites; a forged mobile request cannot bypass the catalog rules.

Preview executes the existing rating engine without a write and returns only
current/projected rating components. Add/remove commits the build change, after
which the client refetches detail and build. The mobile client never submits a
rating or delta. The established weights remain handling 24%, power 18%,
braking 18%, track readiness 16%, reliability 12% and thermal 12%.

Archived detail is readable, but edit, primary, image, match and build mutations
are blocked. Restore and permanent delete continue to use the M2C lifecycle-v1
routes.

### Detail and Build Errors

| Code | HTTP | Meaning |
| --- | ---: | --- |
| `MOBILE_GARAGE_INVALID_BODY` | 422 | JSON body shape is invalid. |
| `MOBILE_GARAGE_EDIT_BLOCKED_BY_BUILD` | 409 | Requested identity conflicts with installed modifications. |
| `MOBILE_GARAGE_PRIMARY_FAILED` | 500 | Primary mutation could not complete. |
| `MOBILE_GARAGE_IMAGE_UNSUPPORTED_FORMAT` | 422 | MIME or file signature is not JPEG/PNG/WebP. |
| `MOBILE_GARAGE_IMAGE_TOO_LARGE` | 413 | Image exceeds 8 MiB. |
| `MOBILE_GARAGE_IMAGE_UPLOAD_FAILED` | 503 | Storage upload or conditional database update failed. |
| `MOBILE_GARAGE_IMAGE_REMOVE_FAILED` | 503 | Image reference could not be cleared safely. |
| `MOBILE_GARAGE_STORAGE_UNAVAILABLE` | 503 | Public Supabase storage configuration is unavailable. |
| `MOBILE_GARAGE_BUILD_UNAVAILABLE` | 409 | Active-build mutation was requested for an archived vehicle. |
| `MOBILE_GARAGE_MODIFICATION_NOT_FOUND` | 404 | Part is absent, removed or not owned in the requested vehicle context. |
| `MOBILE_GARAGE_MODIFICATION_INACTIVE` | 409 | Catalog definition was deactivated. |
| `MOBILE_GARAGE_MODIFICATION_DUPLICATE` | 409 | Part is already installed. |
| `MOBILE_GARAGE_MODIFICATION_SLOT_OCCUPIED` | 409 | Component slot is occupied. |
| `MOBILE_GARAGE_MODIFICATION_INCOMPATIBLE` | 409 | Part is definitively incompatible. |
| `MOBILE_GARAGE_MODIFICATION_CONFLICT` | 409 | Part conflicts with an installed item or rule. |
| `MOBILE_GARAGE_MODIFICATION_REQUIREMENT_MISSING` | 409 | A prerequisite is missing. |
| `MOBILE_GARAGE_MODIFICATION_REQUIRED_BY_BUILD` | 409 | Removal would break an installed prerequisite. |
| `MOBILE_GARAGE_MODIFICATION_FAILED` | 500 | Build write failed unexpectedly. |
| `MOBILE_GARAGE_RATING_PREVIEW_FAILED` | 500 | Rating preview failed unexpectedly. |
| `MOBILE_GARAGE_CATALOG_MATCH_INVALID` | 409 | Match request is not allowed for this vehicle state. |
| `MOBILE_GARAGE_CATALOG_MATCH_FAILED` | 500 | Match request failed unexpectedly. |

No additional server environment variable is introduced by M2D. Storage uses
the existing public Supabase URL/publishable key and the authenticated member's
access token; no service-role key is used.
