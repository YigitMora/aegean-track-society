# Production operations

Production database workflows are manual, restricted to `main`, and protected by
the GitHub `Production` environment. They verify that the checked-out commit is
the current `origin/main` commit before accessing the production database.

## Catalog update

1. Merge the approved catalog commits into `main`.
2. Wait for the matching Vercel Production deployment to report `Ready`.
3. Run the **Production Catalog Seed** workflow from `main`.
4. Enter `SEED PRODUCTION` in the confirmation field.
5. Verify the workflow summary and logs show the expected active definition
   counts, created/updated/unchanged counts, zero duplicate stable codes, zero
   `BMW M` brand rows, and zero stable-code loss.

The catalog workflow does not accept event price or capacity values. It invokes
only the catalog seed scope and does not modify events, event packages,
registrations, users, or admin data.

## Event update

1. Run the **Production Event Seed** workflow from `main`.
2. Enter the event slug, package price, package capacity, and
   `SEED EVENT PRODUCTION` confirmation.
3. Verify the event page shows the intended event and package values.

The event workflow invokes only the event reference-data scope. It does not run
catalog expansion work.

## One-time GitHub configuration

Configure these values once for the repository and protect the production
workflows with the `Production` environment:

| Name | GitHub type | Purpose |
| --- | --- | --- |
| `VERCEL_ACCESS_TOKEN` | Secret | Read-only Vercel API access for release verification |
| `VERCEL_PROJECT_ID` | Repository variable | Expected Vercel project identity |
| `VERCEL_TEAM_ID` | Repository variable | Expected Vercel team or account identity |
| `DATABASE_URL` | Production environment secret | Production database connection for manual seed and migration workflows |

Do not paste these values into workflow inputs. The release verifier reports
only failed boolean check names, never tokens or configured identifiers.

## Release diagnostics

`VERCEL_DEPLOYMENT_PROVENANCE_MISMATCH` lists the failed checks, such as
`project_id_match`, `owner_team_id_match`, `production_target`, `ready_state`,
`alias_assigned`, `repository_match`, `sha_match`, `ref_main`, and
`canonical_alias_match`. Fix the named configuration or deployment mismatch and
rerun verification against the same approved `main` commit.

Catalog and event seed workflows do not deploy the application or run database
migrations. Use the separate production migration workflow only when an
approved schema migration exists.
