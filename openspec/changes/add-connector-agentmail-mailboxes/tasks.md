# Tasks

- [x] Read resource contracts and inspect the current hosted mailbox contracts.
- [x] Create an isolated local branch from current main.
- [x] Add provider, input mirrors, shared projection and mailbox resource.
- [x] Implement the five mailbox operations and explicit ownership bindings.
- [x] Add sealed-unit tests and synthetic provider fixtures.
- [x] Compare the maintainer's billing snapshot and align the provider release
  acknowledgment with its 200 response (the generic REST route remains 202).
- [x] Pass scoped tests, typecheck, lint/format and deterministic compilation.
- [x] Record the maintainer-confirmed legacy enum value `AgentMailInbox` and its
  required bridge to the compiled `agentmail/mailbox` ID.
- [ ] Adapt existing resource snapshots/pointers in the private host and verify
  the identity bridge, ownership scope and hosted output enrichment.
- [ ] Add custom domain resources and enable verified owned custom domains.
- [x] Add periodEndIso, deterministic time conversion and the GB_MONTH rate
  unit; integrate the confirmed storage formula and daily reconciler locally.
- [x] Pass storage/ABI and retry-boundary regressions, the full offline suite,
  full typecheck, scoped lint/format and two byte-identical forced
  frozen-metadata compiles. The PR validation records the final run totals.
- [x] Keep client_id vendor-safe and collision-free, preserving UUID/ULID
  spellings and rejecting overlong encoded IDs before upstream IO.
- [ ] Wire periodEndIso and post-teardown reconciliation in the private host;
  verify nonempty metric samples and ledger mapping.
- [x] On 2026-11-04, create one real default-domain test mailbox through the
  compiled connector; verify native reads, display-name updates, resource
  verify/refresh and a valid empty storage metric response. Check owned listing,
  foreign-resource denial and the release mark with the local ownership adapter.
- [x] Record stale immediate reads after PATCH and confirm later reads and the
  local refreshed snapshot converge. Preserve the initial failed assertions.
- [x] Verify native asynchronous teardown (202, then resource_deleting 409,
  then confirmed 404) and post-delete metrics returning 200 with an empty series.
- [x] Fix release completion for asynchronous cleanup and an already absent
  inbox; add sealed-unit regressions and confirm the updated hook converges live
  with one GET and no duplicate DELETE.
- [ ] Verify nonempty native storage samples and their post-delete retention.
  An unsent draft with a 256-KiB test attachment did not produce such samples;
  the user prohibited email sending.
- [ ] Verify private-host refresh convergence and end-to-end billing/release.
- [x] Prepare local review materials; commit/push/PR remain subject to user approval.

Messages, drafts, threads, attachments, allow/block lists and domain endpoints
remain later slices. Their input contracts are inventoried separately.
