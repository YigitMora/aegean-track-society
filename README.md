# Aegean Track Society

Foundation, registration, manual payment confirmation, and reserved iyzico Checkout Form flow for the Aegean Track Days event series under Aegean Track Society.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create `.env`:

```bash
cp .env.example .env
```

3. Update `DATABASE_URL` in `.env` with your PostgreSQL connection string.

4. Create the database tables:

```bash
pnpm prisma migrate dev --name init
```

5. Seed Kula MyTrack:

```bash
pnpm prisma db seed
```

6. Start the development server:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Seed Data

The seed creates:

- Event: Kula MyTrack
- Event day: Sunday, 2026-09-20
- Package: SEP20, Sunday Track Day

Package prices and capacities are controlled by `.env` values. Defaults are `0.00` and `0` until final commercial values are approved.

For payment testing, set `SEED_PACKAGE_SEP20_PRICE` to a positive amount before seeding, for example:

```bash
SEED_PACKAGE_SEP20_PRICE="1.00"
```

## Manual Launch Flow

Current launch mode defaults to manual payment confirmation:

```bash
PAYMENT_MODE="manual"
```

```txt
Register -> Admin confirms payment -> QR email -> Check-in
```

In this mode, public registration creates a pending unpaid reservation. The team confirms payment from the admin participant detail page after offline/manual payment is received. That admin confirmation issues the participant code, QR confirmation email, and check-in eligibility.

This mode adds manual payment provider values to the Prisma schema. Apply the database migration before using admin confirmation:

```bash
pnpm prisma migrate dev --name add_manual_payment_provider
pnpm prisma generate
```

For production, commit the generated migration and run:

```bash
pnpm prisma migrate deploy
```

iyzico integration remains in the codebase but is disabled pending the merchant decision.

## iyzico Sandbox

To reactivate iyzico later, set:

```bash
PAYMENT_MODE="iyzico"
```

Then configure iyzico credentials and make sure the package price is greater than `0`.

Set the following values in `.env`:

```bash
NEXT_PUBLIC_APP_URL="https://your-public-dev-url.example"
IYZICO_API_KEY="sandbox-your-api-key"
IYZICO_SECRET_KEY="sandbox-your-secret-key"
IYZICO_BASE_URL="https://sandbox-api.iyzipay.com"
```

iyzico Checkout Form requires a reachable callback URL. For local testing, expose your dev server with a secure tunnel and use that HTTPS URL as `NEXT_PUBLIC_APP_URL`.

The iyzico callback route is:

```txt
/api/payments/iyzico/callback
```

## Confirmation Email

The email provider abstraction defaults to Resend. Configure:

```bash
EMAIL_PROVIDER="resend"
RESEND_API_KEY="re_your_api_key"
EMAIL_FROM="Aegean Track Society <registrations@your-domain.com>"
```

`EMAIL_FROM` must use a sender/domain verified in Resend. In manual launch mode, confirmation email is sent after an admin marks the registration as paid and confirmed. In iyzico mode, it is sent after server-side payment verification. If email sending fails, the registration remains confirmed and the failed attempt is recorded in `EmailLog`.

## Participant Code

Participant codes follow `ATD-KULA-2026-0001` and are generated inside the same database transaction that confirms payment.

## Admin Panel

The MVP admin panel uses environment-based email/password credentials and a signed HTTP-only session cookie. Configure:

```bash
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="change-this-password"
ADMIN_SESSION_SECRET="use-a-long-random-secret"
```

Admin routes:

- `/admin` dashboard
- `/admin/check-in` QR token lookup and manual check-in
- `/admin/participants` participant list, filters, and search
- `/admin/participants/[id]` participant detail and audited admin notes
- `/admin/export` protected CSV export
- `/check-in/[token]` protected QR lookup route

Use a strong unique password and a long random `ADMIN_SESSION_SECRET` in production.

The QR check-in flow hashes the scanned raw token with the same SHA-256 method used when issuing QR codes, then matches it against `Registration.qrTokenHash`. Raw QR tokens and token hashes are not shown in admin screens or CSV exports. `/admin/check-in` supports native browser camera scanning where `BarcodeDetector` is available, plus pasted QR URLs/raw tokens and manual search by participant code, name, phone, email, or plate.

## Event-Day Readiness

Before launch in manual payment mode, verify:

- `PAYMENT_MODE` is set to `manual`.
- Email sender domain is verified with the email provider.
- `EMAIL_FROM` uses the verified sender/domain.
- `SEED_PACKAGE_SEP20_PRICE` has the real package price before seeding/updating packages.
- `SEED_PACKAGE_SEP20_CAPACITY` has the real operational capacity before seeding/updating packages.
- `DATABASE_URL` points to the production PostgreSQL database.
- `NEXT_PUBLIC_APP_URL` is the public HTTPS production URL.
- Deployment is served over HTTPS so mobile camera permissions work; iyzico callbacks also require HTTPS if reactivated.
- `/admin` shows no unexpected readiness warning cards.
- `/admin/check-in` camera scan, pasted QR URL, and manual search are tested on the event phones.
- Admin users can open a pending participant and use “Mark as Paid & Send QR Confirmation”.

## Deployment Checklist

## Production Database Migrations

Vercel deployments do not run Prisma migrations automatically. The Vercel build command is intentionally limited to:

```bash
pnpm build
```

Run production migrations manually from a trusted development environment or a dedicated CI job before deploying or before opening registration.

### GitHub Actions Migration Workflow

Use the `Production Database` GitHub Actions workflow to apply committed Prisma migrations and seed production data.

Required GitHub secret:

- `DATABASE_URL`: production Supabase transaction pooler connection string.

The workflow is manual-only and uses the protected `production` environment. Configure GitHub Environment approvals before launch so production database changes require review.

The workflow runs:

```bash
pnpm prisma migrate deploy
pnpm prisma db seed
```

When starting the workflow, enter the production SEP20 package price and capacity. Those values are passed to the seed script as `SEED_PACKAGE_SEP20_PRICE` and `SEED_PACKAGE_SEP20_CAPACITY`.

Recommended production migration commands:

```bash
DATABASE_URL="postgresql://..." pnpm prisma migrate deploy
DATABASE_URL="postgresql://..." pnpm prisma db seed
```

Keep migration execution outside the Vercel build because Supabase pooler connections can make deployment-time migrations unstable. Preview deployments should use a separate preview database or omit production database env vars so preview builds cannot migrate production.

For Vercel or similar hosting:

- Use a production PostgreSQL database and set `DATABASE_URL`.
- Set `PAYMENT_MODE="manual"` for launch.
- Set `NEXT_PUBLIC_APP_URL` to the public HTTPS production URL.
- Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and a long random `ADMIN_SESSION_SECRET`.
- Set `EMAIL_PROVIDER`, `RESEND_API_KEY`, and verified `EMAIL_FROM`.
- Set real `SEED_PACKAGE_SEP20_PRICE` and `SEED_PACKAGE_SEP20_CAPACITY`, then seed or update the production package.
- Vercel uses `pnpm build` only; it does not run migrations.
- Run the `Production Database` GitHub Actions workflow before deploying app code that depends on new migrations.
- After the first production migration, seed or update the event data with `DATABASE_URL="..." pnpm prisma db seed` from a trusted environment if the production event/package rows do not exist yet.
- Serve only over HTTPS.
- Submit a test registration, confirm it manually in admin, verify the QR email, and test check-in on the event phones.

Before reactivating iyzico, verify:

- Real iyzico merchant credentials are configured.
- `IYZICO_BASE_URL` points to production, not sandbox.
- `PAYMENT_MODE` is set to `iyzico`.
- `NEXT_PUBLIC_APP_URL` is the public HTTPS production URL.

When `PAYMENT_MODE=iyzico` and `IYZICO_BASE_URL` contains `sandbox`, the site shows a test mode banner.

Basic in-memory abuse protection is enabled on `POST /api/registrations`, covering registration attempts and payment initialization. For high traffic or multi-instance deployment, replace it with a shared store such as Redis or platform rate limiting.

## Payment Reconciliation

To inspect old `INITIATED` payments and safely query iyzico:

```bash
pnpm payments:reconcile --minutes=30 --limit=50
```

Confirmed iyzico payments are finalized through the same participant code, QR, check-in row, and email path used by the callback.

By default, unverified payments are left pending with the latest iyzico response recorded. To mark unverified old payments as failed/cancelled, run:

```bash
pnpm payments:reconcile --minutes=60 --limit=50 --fail-unverified
```
