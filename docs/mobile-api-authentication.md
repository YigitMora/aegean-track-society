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
