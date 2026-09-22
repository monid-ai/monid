# Tasks: add-connector-perplexity

## Draft implementation

- [x] Read current reference and quickstart; flag language-limit disagreement.
- [x] Add provider, Search endpoint, faithful optional inputs and flat billing.
- [x] Add synthetic shared fixture chains and compiled/wire-level test coverage.
- [x] Add separately gated live smoke test.
- [x] Update and review the endpoint ID lock. Only `perplexity#search` added; unrelated upstream lock drift left untouched (the ID check fails identically on the base revision).
- [x] Run formatting, type check, offline tests and forced compilation. On upstream `2b4a1a0`: full offline suite 1229 passed, 0 failed, 205 ignored; connector suite 59 passed, 0 failed, 1 ignored (live-gated).
- [x] Inspect the compiled contract and deterministic output. Two forced builds differ only in `generatedAt`.
- [x] Resolve the language-limit acceptance question with live evidence: 10, 11 and 20 distinct codes returned HTTP 200.
- [x] Run 28 live-boundary cases: 26 HTTP requests (16 HTTP 200, 10 HTTP 400) and two local validation rejections.
- [x] Add 12 trimmed, scrubbed recorded fixtures and offline replay tests.
- [x] Document observed people/context incompatibility and mixed-domain acceptance without asserting unverified semantics.

## Explicitly not completed

- [ ] Confirm hosted ingestion, credentials, pricing, forwarding and attribution.
- [ ] Publish a catalog release or activate hosted traffic. Neither is part of this draft contribution.
