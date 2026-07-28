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
a durable, expiring reservation before their external adapter is invoked. The
legal-hold setter locks the same deletion request row. It therefore either
commits before a reservation and blocks that side effect, or returns
`COMMIT_POINT_PASSED` without claiming that an already-reserved adapter call
was stopped. Reservations expire with the worker lease so crash recovery can
take over; adapter retry behavior remains idempotent at the Storage, Auth and
email provider boundaries.
