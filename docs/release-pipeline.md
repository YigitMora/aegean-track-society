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
3. Run `Verify Production Release`. It requires exactly one deployment created
   by the trusted `vercel[bot]` integration for the expected SHA, then verifies
   the configured Vercel project, team/account, linked GitHub repository,
   `main` source ref, Production target, READY state and exact Git SHA through
   the Vercel API.
4. Verify through the Vercel API that the fixed canonical alias
   `https://www.aegeantracksociety.com` is bound to that exact deployment.
5. Verify that both the unique deployment and canonical production domain serve
   `/api/mobile/v1/release` with the exact SHA and compatible contract manifest,
   then probe the canonical API with unauthenticated, read-only GET requests.
6. Only then may the mobile release-time contract gate accept the backend SHA.

An HTTP status, environment label, `.vercel.app` hostname or self-reported SHA
alone is not provenance. The verifier fails on untrusted or ambiguous GitHub
deployment metadata, project/team/repository/target/SHA mismatch, a stale
canonical alias, redirects, HTML, malformed JSON, or missing
no-store/Bearer/contract headers. The canonical origin is fixed in code and is
not an operator input. The verifier never sends an application Bearer token and
never performs a mutation.

## Contract versioning

`contracts/mobile-api-contract.json` is the backend-owned manifest. Each domain
publishes a response header and an array of supported versions. The garage
lifecycle entry also defines the exact 17-operation route set and the secondary
detail contract required by each applicable route. Keeping an older version in
the version array permits a future backend to remain compatible with mobile
clients that still require it. The public release manifest is safe metadata
only: it contains route/contract versions and `VERCEL_GIT_COMMIT_SHA`, never user
data or credentials, and is never accepted as provenance by itself.

Live production verification probes only the manifest's four safe garage GET
operations plus the existing read-only auth/application probes. Mutation route
coverage comes from exact deployment provenance and deterministic backend/mobile
route tests; unauthenticated GET probes do not prove mutation behavior.

The mobile repository pins a deterministic copy for pull-request CI and declares
one required version per domain. Mutable production is checked only by the
separate release-time gate.

## Production database boundary

`Production Database Migration` and `Production Database Seed` are distinct
manual workflows. Both use the `Production` environment and the shared
`production-database` concurrency group.

- Migration requires `MIGRATE PRODUCTION <full-dispatch-SHA>` and runs only
  `prisma migrate deploy`.
- Seed requires `SEED PRODUCTION <full-dispatch-SHA>`, validates its package
  inputs, and runs only `prisma db seed`.
- Neither operation is triggered by a push, merge, Vercel deployment, or normal
  CI. Authorization rejects a non-`main` dispatch before dependency installation
  or environment-secret access. The operation checks out the approved SHA with
  persisted credentials disabled. `DATABASE_URL` exists only on the final Prisma
  step. Each run records operation, actor, run URL and exact SHA without printing
  database credentials or rows.

Repository CI blocks a Prisma schema change unless a newly added migration
directory contains `migration.sql`, and rejects modification, deletion or rename
of an existing migration. This is a structural policy only: without a disposable
database or shadow database CI cannot prove semantic equivalence between schema
and SQL. Schema changes therefore remain review-blocked unless accompanied by a
new migration, and semantic validation remains a later isolated-database gate.

Database rollback is never an automatic down migration. A failed schema rollout
stops the release and requires a reviewed forward-fix migration. Application
rollback may redeploy a known SHA only when its contract remains compatible with
the current database.

## Secrets and public configuration

Normal CI requires no repository or environment secrets. Its scanner checks
tracked and non-ignored untracked text for repository-relevant credential
families, hides matched values, and fails closed when a newly changed binary,
non-regular or larger-than-5-MB file cannot be scanned safely.

Production database workflows require `DATABASE_URL` as a secret on the
`Production` environment. The deployment verifier requires the workflow-provided
read-only `GITHUB_TOKEN`, a read-only `VERCEL_ACCESS_TOKEN` environment secret,
and `VERCEL_PROJECT_ID` plus `VERCEL_TEAM_ID` environment variables. Vercel must
expose its standard `VERCEL_GIT_COMMIT_SHA` system value at runtime.

U1A adds no live secret or variable. The production release gate is intentionally
inoperable until the Vercel secret and both identifiers are configured in the
authorized settings phase; missing configuration fails closed.

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
- Add a read-only Vercel token as the `Production` environment secret
  `VERCEL_ACCESS_TOKEN`. Add the exact non-secret identifiers
  `VERCEL_PROJECT_ID` and `VERCEL_TEAM_ID` as environment variables. Restrict the
  environment to `main` before enabling the gate.
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
