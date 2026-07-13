# ATS Garage Lifecycle Performance

Reviewed on 2026-07-13.

Sprint 4L changes the garage archive and permanent-delete actions from redirect-first flows to structured server-action responses consumed inline by the garage lifecycle UI. The database mutations remain the same lifecycle operations: archive soft-deletes active vehicles and clears primary selection when needed; permanent delete removes archived vehicles, their modification rows, and linked registration rows.

## Implementation Notes

| Area | Sprint 4L behavior |
| --- | --- |
| Archive action | Shared helper updates selected vehicles in one scoped member operation and revalidates only the garage account path. |
| Permanent delete action | Shared helper deletes selected archived vehicle rows and associated modification/registration rows before image cleanup. |
| UI latency | Garage cards stay on the page, show pending state, and refresh after successful structured action results. |
| Duplicate submit guard | Bulk and card-level forms disable controls while a lifecycle action is pending. |
| Selection failure behavior | Selection is preserved on failure and cleared on success. |
| Storage cleanup | Supabase object removal remains awaited because this Next.js version does not expose a typed `after` hook in the local dependency tree. |
| Timing telemetry | Development-only logs emit safe aggregate fields with labels `GARAGE_ARCHIVE_BATCH`, `GARAGE_DELETE_BATCH`, and `GARAGE_DELETE_STORAGE_CLEANUP`. |

## Timing Scope

Local live timing was not measured in Codex because the sprint does not run production migrations or deploy, and no authenticated production-like member garage dataset is available in this workspace. The instrumentation is intentionally placed around the database and storage segments so preview/prod validation can record exact timings without exposing vehicle notes, plates, file names, or object paths.
