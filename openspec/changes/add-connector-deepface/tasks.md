# Tasks: add-connector-deepface

- [x] Read the canonical API schemas and connector authoring rules.
- [x] Add provider, faithful wire mirrors, and narrowed monid_v1 bindings.
- [x] Declare exact credit draws and profile handshake; add taxonomy leaf.
- [x] Add synthetic fixtures and compiled-artifact validation/billing tests.
- [x] Document dedicated-account, fee, backend, broker, and rollout gates.
- [x] Run formatting, lint, full typecheck, focused replay tests (17 pass; 1 gated live test skipped), compiler, and version gate.
- [x] Pin exactly the three new endpoint IDs and test their compiled/locked identity set.
- [ ] Complete the repository-wide replay suite in CI (local full runs were started, then stopped to release the shared test host; no full-pass claim).
- [ ] Resolve upstream ID-lock drift separately (the unchanged baseline has 66 unregistered and 7 removed IDs; this connector adds no new drift).
- [ ] Activate approved account and reconcile authorized live traffic (release gate; not part of this proposed connector PR).
