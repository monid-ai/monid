# Add the AgentMail mailbox slice

## Problem

Monid exposes AgentMail operations in its hosted catalog, but the public
connector repository has no AgentMail provider or owned mailbox definition.
The first local implementation covers the five mailbox operations before
adding domains, messages, threads, drafts and mail policies.

## Change

- Add bearer authentication and preserve the five published public paths.
- Bind mailbox creation, owned listing/detail, display-name updates and release
  requests to the compiled `agentmail/mailbox` resource. The maintainer
  confirmed its legacy host kind is `AgentMailInbox`; the host bridge remains
  an integration requirement.
- Preserve the public email-address identifier and store the native inbox ID
  separately, so native IDs need not equal email addresses.
- Use the documented `client_id` for retry-safe creation.
- Declare $1 period-one creation and $1 monthly fixed rent from Monid's card.
- Reuse Saperly's ownership mechanism and add daily cumulative storage metering.
- Extend the resource window with the maintainer-approved periodEndIso, add a
  binary GB-month unit and deterministic ISO conversion; engine 0.6.0 records
  these contract changes (see design.md).

## Deployment gates

This is the first reviewable slice, not a complete production migration. Before
production deployment:

1. Adapt the confirmed legacy kind `AgentMailInbox` to compiled ID
   `agentmail/mailbox` at the private reader/store boundary, preserving workspace
   ownership and external IDs. Confirm the existing snapshot shape before
   migrating pointers. The source pack omits the creation seed and full snapshot;
   the maintainer supplied the exact enum string separately on 2026-10-27.
2. The public callback now requires window.periodEndIso. Wire private-host
   usagePeriod.periodEnd.toISOString() into every reconciliation call. The
   public port cannot make that private caller change itself. Verify live metric
   shapes, the intentional zero vendor cost-ledger mapping and post-teardown
   invocation before enabling charges. Do not assume a 30-day month.
3. Configure and test the confirmed host policy: renewLead 3 days, releaseLead
   0 days for unpaid resources, immediate user-requested teardown and no refund.
   The provider endpoint acknowledges with 200; the generic REST resource route
   uses 202. The resource lifecycle alone deletes upstream.
4. Add custom domain resources and ownership/verification before permitting
   mailbox creation on a custom domain. Until then the local slice returns 501
   with zero usage before any upstream call for such requests.
5. Integrate host-owned resourceId/state/renewal response enrichment. The public
   OwnedResource ABI intentionally does not expose those backend fields.
6. Verify native behavior and full host scheduling/wallet behavior separately.

## Evidence

Checked 2026-10-27, without paid API calls or live mailbox creation:

- Monid CLI `inspect -p agentmail` for all five public mailbox paths.
- https://monid.ai/tutorial/how-to-monid-agent-email-and-phone (Monid rent).
- https://docs.agentmail.to/api-reference/inboxes/create (native fields).
- https://docs.agentmail.to/api-reference/inboxes/update (native patch).
- https://docs.agentmail.to/api-reference/inboxes/metrics/query-usage (storage
  series and bucket limits; archived official documentation).
- https://docs.agentmail.to/idempotency (resource creation uses client_id).
- `connectors/saperly/resources/phone-number/resource.ts` and bound endpoints.

Synthetic fixtures prove connector behavior, not actual vendor or hosted bills.

## Live verification, 2026-11-04

One dedicated default-domain mailbox was created through the compiled connector
using the original stable client_id. Its native creation, GET, PATCH, resource
verification, refresh and storage query succeeded. Owned listing and an unowned
address denial were checked with a local in-memory ownership reader, which does
not establish private-host tenant isolation. The repository's credential-gated
read-only smoke test passed against that mailbox before its later teardown.

Immediate reads after PATCH returned the previous display name even though the
PATCH response contained the new name. Subsequent reads through the compiled
connector and its resource refresh returned the new name. Retain the original
failed immediate-read assertions; the exact delay and upstream cause remain
unknown. The host must verify refresh convergence during integration.

The native storage response was {storage_bytes: []}; the reconciler returned
zero. Nonempty storage samples and vendor invoice reconciliation were not
verified. The create run derived one dollar of Monid usage without invoking a
hosted wallet, so this does not establish an actual customer or vendor charge.
The release endpoint emitted its expected mark without issuing native DELETE.
At that initial checkpoint the mailbox remained provisioned for follow-up
checks. No email was sent. The later teardown checks below supersede that state.

### Follow-up teardown, 2026-11-04

An unsent draft and a 256-KiB synthetic text attachment were stored in the
dedicated test mailbox. Native hourly, diagnostic minute and aligned-hour
queries still returned empty storage arrays. The user explicitly prohibited
email sending, so no send was attempted and no nonzero storage result is claimed.

The authorized native DELETE returned 202, followed by a GET 409 with code
resource_deleting and a later GET 404. Repeating DELETE for the absent target
also returned 202. Release now checks native identity before deletion and
confirms absence after asynchronous acceptance; pending cleanup throws for host
retry. A completed retry returns success on GET 404/410 without another DELETE.
The corrected compiled hook was verified against the deleted test mailbox.

Storage remained readable after confirmed deletion: HTTP 200 and an empty
storage_bytes array. The test cutoff was recorded after absence was confirmed,
not at the earlier 202 acknowledgment. The test mailbox and its draft were
deleted and the local active-mailbox configuration was retired. Nonempty
storage samples, retained nonempty post-delete usage and private-host E2E
remain outstanding. No email, commit, push or upload was performed.

## Maintainer billing evidence, received 2026-10-27

The supplied code pack describes monid-services commit 01cb8fd5. Treat it as
the existing integration's behavior, not a new live verification by this port.
The source pack stays outside the public worktree; only the compatibility
requirements are recorded here.

- Storage uses 1024^3 bytes per billed GB (GiB). Compute the arithmetic mean
  of storage_bytes samples, divide by 1024^3, multiply by elapsed-window length
  divided by the usage period's actual length, then round GB-months to four
  decimals before multiplying by $1. Do not time-weight or clamp the fraction.
- Query hourly samples; switch to daily when the window exceeds 1000 hours.
  Request limit 1000. A valid empty series is zero; an HTTP read failure retries.
- Reconcile daily. A $0.10 hold is temporary wallet headroom, not another fee.
  Rent prepays independently; storage settles at the actual usage boundary.
- User release deletes immediately and settles storage after successful teardown,
  using the actual post-teardown cutoff, including any deletion retry time.
  Already-paid current or next-period rent is not refunded.
- The pack records a historical live check that deleted inbox metrics remain
  readable. Repeat that check in controlled integration testing before deployment.
- Legacy inbox externalId is the email address. The pack does not include the
  full data shape, parent-account provisioner or the literal resource slug.
  A later maintainer reply on 2026-10-27 confirmed the exact case-sensitive
  string: ResourceSlug.AGENTMAIL_INBOX = "AgentMailInbox".
- The generic REST release returns 202; the provider release run returns 200.
- The private adapter intentionally keeps unitPrice cost-ledger values at zero.
  Do not rewrite them as positive rates; agree the new host ledger mapping.
- Received email also costs $0.001 through a webhook-only inbound-messages run.
  This internal operation is additional to the 35 discovered public contracts.
- A zero-rent parent account/pod resource and custom-domain resources also exist.
  The pack omits the account implementation; full tenant isolation needs that seam.
