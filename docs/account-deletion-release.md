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
