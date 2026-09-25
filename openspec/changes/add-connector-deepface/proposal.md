# Proposal: add-connector-deepface

Add deepface.dev's representation, verification, and vector-comparison API as
three synchronous connectors. The dedicated, versioned `monid_v1` contract is
the price source; ordinary prepaid pricing remains out of scope.

The provider pins its required pricing-profile header, x-api-key auth, one
credit pool, and three fixed successful-call rates. Bindings restrict workload
to five explicitly selected approved models, safe image encoding, baseline
detector settings, and single-pair vector comparison. The gateway must enforce
the same profile and workload before compute. No engine, hook, or doc-format
changes are needed.

A single synchronous lifecycle relay forwards a validated host run UUID as the
provider request ID, preserving identity across host retries. It never polls,
retries, or creates an asynchronous job. Duplicate rejection is not result
replay; durable reconciliation of uncertain outcomes is a hosted release gate.

This is an integration proposal, not an activated commercial arrangement.
Backend deployment, a dedicated capped account, payment terms, broker credit
conversion and fee pass-through, live smoke tests, and catalog ingestion are
release prerequisites documented in the connector README. All fixtures are
synthetic and contain no biometric data.

Capability: `deepface-connector`. New taxonomy leaf: `face-verification`.
