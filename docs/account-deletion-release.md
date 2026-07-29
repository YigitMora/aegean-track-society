# Account Deletion First-Release Gate

The durable account-deletion protocol is a first-release contract between the
web backend and mobile application. The referenced pre-durable checkpoint
`76aa80e` is not available in this checkout, and repository history contains
no checked-in evidence of an installed legacy mobile client or an exact legacy
endpoint/method contract.

The deprecated synchronous or GET-based deletion contract is intentionally not
restored. The backend and mobile application must be released in order: the
mobile build that understands verification, receipt polling, pending and
blocked states must be available before the durable deletion flow is exposed to
members. This is a deployment gate, not a compatibility fallback.

The release owner must retain this gate until distribution evidence establishes
that every supported client understands the durable asynchronous contract.

## Legal-hold and side-effect ordering

Storage deletion, Auth user deletion, and completion-email delivery each write
a durable reservation and a separate invocation state before their external
adapter is invoked. Each effect has a stable identity across retry, lease
replacement and takeover. An expired `RESERVED` or `INVOKING` generation is
recovered as `RECONCILING`; a stale owner cannot write the replacement
generation's result. Storage applies deletes to the persisted exact object set,
Auth deletion is scoped to the exact user and treats only that provider's 404
as reconciled success, and the Resend completion email uses the provider's
documented idempotency key.

The legal-hold setter locks the same deletion request row. It always persists
the hold intent. If an effect was already reserved it returns
`COMMIT_POINT_PASSED`: that current effect may complete or reconcile, while all
future irreversible phases are held. Releasing the hold resumes the durable
operation from its recorded stage without caller-managed retry timing.

## Reconciliation-required operations

The completion-email payload is encrypted and persisted before its first
transport invocation, together with a stable key, payload fingerprint, first
transport time and retry deadline. The retry deadline is deliberately inside
the email provider's 24-hour idempotency window. A retry after that deadline,
or a provider response that indicates an invalid idempotency request, becomes
`RECONCILIATION_REQUIRED`; it is not silently resent and must be reviewed with
the recorded provider message identifier when available.

Storage accepts only the provider's structured `NoSuchKey` response as an
already-deleted object. Other 404 responses remain retryable failures. The Auth
phase is bound to the persisted normalized provider identity and accepts only a
matched provider's structured `user_not_found` response as an idempotent
success. Provider drift or an ambiguous 404 is fail-closed.

`databaseCompletedAt` is the durable database commit marker. A legal hold that
waits for this transaction reports `COMMIT_POINT_PASSED` with `database` and
prevents the later Auth and completion-email effects.

## Cancellation and planned deletion contract

After a verified request, the server records a seven-day
`scheduledDeletionAt` value and the worker does not claim the request before
that time. A signed-in member may send a strict empty-body `POST` request to
`/api/mobile/v1/account/deletion/cancel`. Cancellation is idempotent only for
the same member's already-cancelled request. It otherwise succeeds only while
the request is still `VERIFIED`, is not under legal hold, has not reached the
server deadline, and has no lease or irreversible phase marker.

The receipt status route preserves its original exact response by default.
Clients that send `X-ATS-Account-Deletion-Contract: account-deletion-v2`
continue to receive the original status-plus-schedule response. Clients that
send `account-deletion-v3` additionally receive the distinct
`verification_pending` state before a valid code has scheduled deletion. Only
the `pending` state carries a non-null, server-owned `scheduledDeletionAt`.
Clients without the header continue to receive only the legacy status object.
This is an additive negotiation boundary, not a client-side schedule
calculation.

`CANCELLED` requests have no runnable attempt time and are excluded from worker
claims. Their encrypted owner contact material is cleared while the opaque
receipt hash remains only for the bounded status-retention period.
