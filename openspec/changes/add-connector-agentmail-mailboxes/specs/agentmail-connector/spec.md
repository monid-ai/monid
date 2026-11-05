## ADDED Requirements

### Requirement: Owned default-domain mailboxes

The provider SHALL preserve the public paths `/create-inboxes`, `/list-inboxes`,
`/inboxes/{id}`, `/update-inboxes/{id}` and `/release-inboxes/{id}`. The public
inboxId SHALL remain an email address. The resource SHALL retain the distinct
native inbox ID for all native calls. The compiled resource ID SHALL be
`agentmail/mailbox`. The maintainer-confirmed legacy host resource kind is
the exact string `AgentMailInbox`.

#### Scenario: Legacy host resource bridge

- WHEN the private host serves an existing AgentMailInbox resource to the engine
- THEN its adapter maps the kind to compiled ID agentmail/mailbox
- AND preserves the owning workspace and external email-address ID
- AND adapts the stored snapshot to the compiled data schema
- AND provision seeds and settle targets resolve to the same host resource kind.

The public core identity grammar remains lowercase provider/slug. Recording the
legacy string does not implement or verify the private adapter or migration.

#### Scenario: Creation and retry

- WHEN the same host-stable run is retried
- THEN the native creation body carries the same deterministic client_id
- AND client_id uses the vendor's permitted characters without collisions
- AND an encoded ID exceeding the native length limit fails before upstream IO
- AND a successful response provisions one owned mailbox, hiding pod/client IDs
- AND the creating run reports exactly $1 with CALL evidence
- AND unreadable success identifiers raise PROVISION_CONSTRUCT for recovery.

#### Scenario: Custom domain integration is absent

- WHEN a caller requests a domain other than agentmail.to in this local slice
- THEN the request returns 501 with zero usage and no upstream calls
- AND the connector does not bypass custom-domain ownership checks.

### Requirement: Ownership precedes upstream access

#### Scenario: Foreign mailbox

- WHEN a read, update or release targets an address outside the ownership window
- THEN it returns a zero-usage 404 before any upstream request or release mark.

#### Scenario: List owned mailboxes

- WHEN the caller lists inboxes
- THEN only the host reader's owned mailbox projection is returned
- AND no pooled vendor list is fetched
- AND host state/renewal metadata is neither guessed nor synthesized.

### Requirement: Lifecycle verification and refresh are retriable

#### Scenario: Resource is missing or provider is temporarily unavailable

- WHEN a verification returns 404
- THEN the mailbox is inactive
- WHEN it returns a transient HTTP failure or inconsistent identity
- THEN the operation throws for retry rather than declaring the mailbox dead
- AND paused mailboxes remain existing resources.

#### Scenario: Display name update

- WHEN a valid displayName update succeeds
- THEN only native display_name is patched using the stored inbox ID
- AND the result emits a resource refresh mark
- AND its complete usage is zero.

### Requirement: One teardown owner

#### Scenario: Native deletion is asynchronous

- WHEN native DELETE returns 202
- THEN release confirms 404/410 absence before reporting completion
- AND a live, deleting or unreadable confirmation throws for host retry
- WHEN a retry finds the mailbox already absent
- THEN release returns success without issuing another DELETE
- AND a mismatched live identity fails before any destructive call.

#### Scenario: Release is requested

- WHEN an owned mailbox is released through the endpoint
- THEN the provider endpoint returns a 200 release_requested acknowledgment and release mark
- AND makes no upstream DELETE itself
- AND the resource lifecycle performs idempotent teardown, tolerating 404/410
- AND a failed teardown retries rather than reporting a completed release.

The host MUST use immediate user-requested teardown before this slice is deployed.
Rent already charged, including the early-prepaid next month, is not refunded.
An acknowledgment alone does not prove completed deletion, storage reconciliation
or stopped wallet charges. The separate generic resource REST route uses 202.

### Requirement: Fixed rent and storage are separate from host execution policy

#### Scenario: Rate card

- WHEN the resource definition is compiled
- THEN it declares one $1 fixed line per creation-anchored month
- AND declares a $1 per GB_MONTH estimated storage line with daily reconciliation
- AND one GB_MONTH uses 1024^3 bytes over the actual monthly period.

Only the private host can verify creation pays period one once and renewals
start at period two. Local declaration checks do not claim that E2E coverage.

The supplied billing snapshot confirms the next period's rent is charged three
days before the current period ends; usage continues on its own clock. Storage
is $1/GiB-month using the mean sample level and actual monthly period length,
rounded to four decimals in GB-months.

#### Scenario: Partial month or delayed release

- WHEN the host reads usage so far or after successful teardown
- THEN it passes window.startIso, endIso and the full periodEndIso
- AND periodEndIso is sourced from usagePeriod.periodEnd
- AND the bill is arithmetic mean bytes / 1024^3 * elapsed / full period
- AND the quantity rounds to four decimals before applying the $1 rate
- AND a cutoff after periodEndIso is not clamped to one month.

#### Scenario: Zero usage and failed reads

- WHEN a valid metrics series is empty or elapsed time is zero
- THEN the reported customer storage consumption is zero
- WHEN metrics fail over HTTP or the success payload is unreadable
- THEN the operation throws for retry rather than settling zero.

#### Scenario: Rate-card and resource ABI compatibility

- WHEN compiling a resource using GB_MONTH and the extended metering context
- THEN the catalog requires engine 0.6.0
- AND the engine refuses a missing periodEndIso, a backwards reading window,
  or a full period that does not end after its start, before executing the hook
- AND deterministic time conversion exposes no wall-clock reader.
