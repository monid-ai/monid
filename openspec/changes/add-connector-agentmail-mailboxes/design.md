# Design: AgentMail storage period context

## Full period end is host context

The maintainer confirmed on 2026-10-27 that the public reconciliation window
must carry `periodEndIso`, populated from private-host
`usagePeriod.periodEnd`. `startIso` already means the usage-period start;
`endIso` is the cumulative reading cutoff. The period end is required,
strictly later than start, and is never inferred from the cutoff or a fixed
30-day month. Zero-length readings are allowed; backwards windows are not.
Post-teardown cutoffs may exceed period end and are deliberately not clamped.

This repository cannot edit the private caller. Deployment requires the host
to pass `usagePeriod.periodEnd.toISOString()` and preserve the existing
storage settle clock independently of prepaid rent.

## Deterministic time conversion and storage unit

Resource hooks receive `utils.time.parseIso`: strict UTC ISO-to-milliseconds
conversion only. There is no current-time reader. Keep Date off the closed-term
global whitelist; timestamp conversion belongs to the engine's host utilities
(founding D5), rather than a handwritten Gregorian calendar in a connector.
Only the resource family gains this capability, its sole current consumer.

Append `Unit.GB_MONTH` to the closed rate-card vocabulary: one binary GiB
(1024^3 bytes) sustained for the actual billing month, matching the legacy
provider's name. Bump engine to 0.6.0, resource ABI floor to 0.6.0, and the
uniform doc-format floor to 0.6.0. The existing uniform-floor policy also raises
unrelated endpoint doc floors; pure hook and async ABI facts remain unchanged.

## Confirmed legacy resource identity

The maintainer's 2026-10-27 reply confirms the exact, case-sensitive legacy
enum value: `ResourceSlug.AGENTMAIL_INBOX = "AgentMailInbox"`. This resolves
the missing literal; the private enum declaration itself was not supplied.

The public resource schema requires a lowercase provider/slug ID and its
authored slug must match its folder (D45). Retain `agentmail/mailbox` as the
compiled identity. `AgentMailInbox` is the private host's legacy resource kind.
Do not assign that PascalCase string to the public slug, normalize it by
guessing, add an unused alias field, or widen the core identity grammar.

The private host must explicitly bridge the two identities at its resource
reader/store boundary. Legacy records served to the engine must satisfy the
compiled OwnedResource shape and mailbox data schema; provision seeds and
settle targets must map back to the same host resource kind. Preserve the
workspace ownership scope and external email-address ID throughout. This
repository has no private host adapter to modify. Existing snapshot adaptation,
pointer migration and their E2E verification therefore remain deployment gates.

## Legacy meter and explicit failure behavior

Preserve the supplied monid-services 01cb8fd5 algorithm: arithmetic sample mean,
binary GiB, elapsed/full-period fraction, four-decimal GB-month rounding, $1
per GB-month, hourly buckets through 1000 hours, daily buckets thereafter,
limit 1000, daily reconciliation, and no fraction clamp. A valid empty series
is zero. Zero elapsed time returns zero before any vendor call.

The legacy reader tolerated malformed/missing series and filtered bad samples.
This port deliberately requires a storage_bytes array of finite nonnegative
numeric samples. An unreadable 200 must retry instead of silently settling $0
or dropping samples and changing the mean. HTTP errors, including post-delete
404, also throw for retry; they never establish a zero charge. Confirm the
native empty-series shape in live integration before deployment.

Report customer storage usage through consumes. Keep vendorConsumes at zero
to preserve the supplied private adapter's intentional zero cost-ledger
bookkeeping; it does not mean the upstream service is free. The vendor invoice
is reconciled outside this meter. The host ledger mapping remains an E2E gate.

## Scope

The meter does not implement wallet holds, the $0.10 buffer, prepaid renewal,
release scheduling, or automatic post-teardown invocation. Those remain host
policy. Legacy resource migration, parent account isolation, custom domains,
dashboard previews and remaining AgentMail operations are separate integration
work. Authored fixtures and replay tests remain explicitly synthetic. Separate
live checks on 2026-11-04 used one dedicated default-domain test mailbox and
the compiled units for creation, owned reads/listing, display-name updates,
verification, refresh and storage reconciliation. The native storage response
was a valid empty storage_bytes array. No hosted wallet was invoked.

An immediate GET and refresh after a successful PATCH returned the previous
display name; later reads returned the updated name. Preserve that observation
as a live consistency limitation. The exact stale-read duration and its cause
were not established. Private-host integration must verify refresh convergence
rather than assume immediate read-after-write consistency. The initial release
endpoint check covered its mark only; a separate native teardown check followed.

## Asynchronous native inbox cleanup

The 2026-11-04 native DELETE returned 202, followed by GET 409 with code
resource_deleting, then GET 404. A further DELETE for the absent test inbox
also returned 202. Do not treat acceptance as completed teardown or rely on
repeating DELETE alone to converge.

The release hook reads the mailbox first. Confirmed 404/410 completes an
idempotent retry without another DELETE; a live response must match the owned
native identity before deletion. After a 202, read again: only 404/410 confirms
completion. Other results throw the existing retryable RESOURCE_OP_FAILED, so
the host must not mark RELEASED or close storage usage early. The host owns
retry scheduling; no new ABI or in-hook polling loop is needed.

After confirmed deletion the native storage query still returned 200 with a
valid empty storage_bytes array. A 256-KiB attachment in an unsent draft did
not produce a nonempty metric series during these checks. No mail was sent;
nonzero native storage samples and their post-delete retention remain unverified.
