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
Authenticated responses include `Cache-Control: no-store`.

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
      "email": "member@example.com",
      "profileComplete": true,
      "requiredConsentsComplete": true,
      "marketingConsent": false
    },
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
details, and raw consent timestamps.

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
