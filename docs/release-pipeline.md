# Backend CI and release safety

## Repository CI

`Backend CI` runs for pull requests and pushes to `main` with read-only
repository permissions. It installs the frozen pnpm lockfile, generates the
Prisma client, typechecks, runs the four existing deterministic mobile API
validators, validates the release foundations, scans repository files for
secret patterns, checks migration/configuration policy, and runs
`git diff --check`.

This repository has no supported lint dependency or lint configuration, so CI
does not claim a lint result. The complete Next.js build performs database-backed
static generation. Pull-request CI therefore does not receive `DATABASE_URL` or
a substitute credential. Vercel Preview remains the full build gate until the
database-dependent build boundary is redesigned.

## Backend-first release order

1. Merge and deploy the backend release first.
2. Wait for a successful GitHub Production deployment for the exact backend SHA.
3. Run `Verify Production Release`. It uses the GitHub Deployments API to bind
   that SHA to the unique Vercel deployment URL.
4. Verify that both the unique deployment and canonical production domain serve
   `/api/mobile/v1/release` with the exact SHA and compatible contract manifest.
5. Verify the canonical mobile API with unauthenticated, read-only GET requests.
6. Only then may the mobile release-time contract gate accept the backend SHA.

An HTTP status alone is not provenance. The verifier fails on redirects, HTML,
missing no-store/Bearer/contract headers, an unavailable deployment URL, or a
manifest SHA mismatch. It never sends an application Bearer token and never
performs a mutation.

## Contract versioning

`contracts/mobile-api-contract.json` is the backend-owned manifest. Each domain
publishes a response header and an array of supported versions. Keeping an older
version in that array permits a future backend to remain compatible with mobile
clients that still require it. The public release manifest is safe metadata only:
it contains contract versions and `VERCEL_GIT_COMMIT_SHA`, never user data or
credentials.

The mobile repository pins a deterministic copy for pull-request CI and declares
one required version per domain. Mutable production is checked only by the
separate release-time gate.

## Production database boundary

`Production Database Migration` and `Production Database Seed` are distinct
manual workflows. Both use the `Production` environment and the shared
`production-database` concurrency group.

- Migration requires the exact typed confirmation `MIGRATE PRODUCTION` and runs
  only `prisma migrate deploy`.
- Seed requires `SEED PRODUCTION`, validates its package inputs, and runs only
  `prisma db seed`.
- Neither operation is triggered by a push, merge, Vercel deployment, or normal
  CI. Each job records workflow name, actor, and exact commit SHA without printing
  database credentials or rows.

Database rollback is never an automatic down migration. A failed schema rollout
stops the release and requires a reviewed forward-fix migration. Application
rollback may redeploy a known SHA only when its contract remains compatible with
the current database.

## Secrets and public configuration

Normal CI requires no repository or environment secrets. Production database
workflows require `DATABASE_URL` as a secret on the `Production` environment.
The deployment verifier uses the workflow-provided `GITHUB_TOKEN` with read-only
deployment access. Vercel must expose its standard `VERCEL_GIT_COMMIT_SHA` system
value at runtime.

Expo `EXPO_PUBLIC_*` values are intentionally bundled into the mobile binary and
are not secrets. Service-role keys, database URLs, private keys, payment-provider
secrets, and user/session data must never use an `EXPO_PUBLIC_*` name.

## U1B live settings still required

Repository files do not protect live settings. U1B must apply and independently
verify the following after these workflows are reviewed:

### Backend repository (public; current GitHub plan supports these controls)

- Add a `main` branch ruleset requiring pull requests and the strict status check
  `Backend CI / Validate backend` before merge.
- Require the branch to be up to date and require conversation resolution.
- Block force pushes and branch deletion; do not permit bypass except the
  repository owner for emergency recovery.
- Configure the `Production` environment with `YigitMora` as one required
  reviewer, leave “Prevent self-review” disabled while there is one operator,
  and restrict deployment branches to `main`.
- Keep `DATABASE_URL` only as an environment secret. Do not expose it to normal
  CI or the deployment verifier.
- In Vercel, keep the Production branch set to `main`, verify that Git integration
  emits GitHub Deployment statuses with a unique `environment_url`, and enable
  standard System Environment Variables so `VERCEL_GIT_COMMIT_SHA` is available
  to the release manifest. Do not add that SHA manually as a secret.

### Mobile repository

- Require `Mobile CI / Validate iOS application` on `main`, require an up-to-date
  pull request and conversation resolution, and block force pushes/deletion.
- Reuse the same one-reviewer `Production` approval boundary for future
  production OTA jobs, while keeping self-review permitted for the sole operator.
- The mobile repository is private and the current GitHub plan rejects branch
  protection/ruleset API access. U1B is blocked there until GitHub Pro (or a
  deliberate public-repository decision) provides the required controls.

No branch protection, reviewer, secret, Vercel, or EAS setting is changed by U1A.
