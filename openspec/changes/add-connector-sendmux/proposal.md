# Proposal: add-connector-sendmux

## Why

An agent needs one owned inbox it can read, reply from, and release. Sendmux
offers saved drafts, threaded replies, attachments, scheduled sending, and
customer-selected outgoing accounts. Monid must keep each workspace's inboxes
separate even though the Sendmux integration credential belongs to one team.

The Sendmux API supplies mailbox creation, deletion, and mailbox-scoped email
operations and a retained cumulative cost meter.
A connector must never turn a pending or failed meter read into zero usage.

## What changes

- Add an owned `sendmux/mailbox` resource. Its external ID is the Sendmux
  mailbox public ID; its display identifier is the email address. Provisioning
  takes an explicit full email address, uses a dedicated integration credential,
  and stores no child mailbox secret.
- Bind every mailbox action to the owned resource before an upstream request.
  The resource ID selects the mailbox; user-supplied mailbox IDs cannot bypass
  Monid's ownership gate.
- Expose saved draft create, list, read, conditional edit, send, schedule,
  cancel, and delete. A draft can prepare a reply, reply-all, forward, or
  adoption from a message in the owned inbox. Sending names the exact saved
  revision.
- Expose bounded mailbox reads: messages, threads, search, changes, labels,
  attachments, raw message, and attachment text. Preserve pagination and
  body/attachment limits from the Sendmux API.
- Use the existing monthly resource clock with zero inbox rent. Meter incoming
  email, outgoing email, and storage once from their authoritative retained cost
  readings. Keep the existing reconciliation cadence, final-window checks and
  post-deletion reads. Endpoint calls have a zero call fee.
- Explain the published USD rates with zero markup: connected outbound
  0.000500 per provider-accepted recipient occurrence, managed outbound
  0.000750, incoming 0.000500 per distinct mailbox delivery, and storage 0.02
  per decimal GB-month, prorated by calendar day. The Pro subscription is
  USD 7 per team per month, separate from inbox usage and never mailbox rent.
- Verify Sendmux webhooks using the timestamp and signature headers over the
  exact request body. Route each event to its owned mailbox; replayed delivery
  attempts keep the event ID.

## Capabilities

- `sendmux-connector`.

## Non-goals

- Linking an existing Sendmux inbox into a Monid workspace.
- Creating or editing a customer's sending provider connection.
- A second charge for a draft-send endpoint when the owned mailbox meter already
  accounts for the accepted email.
- A native per-recipient endpoint card. Send responses do not expose final
  provider-accepted recipient counts or actual provider mode. Requested
  recipients and HTTP success cannot substitute for that evidence.
- Engine or resource ABI changes in this connector PR.

## Dependencies to verify before submission

- Qualify the deployed integration credential, mailbox APIs and retained cost
  readings through the existing integration journey.
- Qualify Monid's existing resource lifecycle, retries and post-deletion usage
  reads. Source support does not establish hosted execution or card rendering.
- Keep one provider key under operator custody. Each workspace's resource
  ownership window limits access to its own inboxes.
