# Tasks: add-connector-sendmux

## 1. Confirm the shared contract

- [ ] 1.1 Verify the deployed Sendmux integration credential, mailbox create,
      read, delete, and idempotent replay with an owned team.
- [ ] 1.2 Verify the deployed final cost-window shape, retained deleted-inbox
      reads and Monid's existing resource lifecycle retries.
- [x] 1.3 Define zero monthly inbox rent, zero endpoint call fees and published
      USD usage-rate metadata without charging the team subscription again.

## 2. Owned inbox tracer

- [x] 2.1 Add provider authentication, mailbox resource, and an explicit-email
      provision endpoint using the existing resource binding contract.
- [x] 2.2 Add owned read and release; prove foreign ID denial before upstream IO
      and retry-safe release.
- [ ] 2.3 Add cumulative incoming, outgoing, and storage reconciliation; prove
      pending, final, repeated, and post-deletion windows.

## 3. Agent email actions

- [x] 3.1 Add saved draft creation, listing, read, conditional edit, send,
      schedule control, and deletion.
- [x] 3.2 Add reply, reply-all, forward, and adoption through Sendmux's source
      draft contract.
- [x] 3.3 Add bounded messages, threads, search, changes, labels, raw email,
      attachment download, and attachment text.
- [x] 3.4 Add webhook verification and owned mailbox routing.

## 4. Verification and submission

- [x] 4.1 Replay fixtures: create, foreign ID, revision conflict, lost send
      response, pending cost, final cost, release retry, and signature tamper.
- [ ] 4.2 Run format, lint, check, test, double compile, identity lock, version
      gate, catalog inspection, and a real integration journey.
- [ ] 4.3 Submit the PR after matching Sendmux APIs are deployed and record the
      qualified existing lifecycle journey and hosted pricing presentation.
