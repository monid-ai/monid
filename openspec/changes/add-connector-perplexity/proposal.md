# Proposal: add-connector-perplexity

Status: local draft. No PR, remote branch, catalog release, or hosted activation.

## Scope

Add `perplexity#search` for `POST https://api.perplexity.ai/search`.
Return native ranked sources, not generated answers. Reuse the existing
declarative engine, Bearer preset, and flat-call billing model without core changes.

The upstream Search API charges $0.005 per successful HTTP request, including
successful empty results and up to five queries. Query count affects rate-limit
units, not the bill. This is the upstream rate, not a Monid retail-price claim.
([Pricing](https://docs.perplexity.ai/getting-started/pricing),
[Search quickstart](https://docs.perplexity.ai/docs/search/quickstart))

## Decisions

- Use `X-Pplx-Integration: monid` and a versionless
  `User-Agent: monid (+https://monid.ai)`.
- Leave optional fields without injected defaults. Document cross-field
  rules and preserve caller input for upstream validation.
- Follow the API reference's 20-language bound. Live requests accepted 10, 11
  and 20 distinct codes; the quickstart's 10-language statement still differs.
- Document live-observed behavior: people search succeeded at 50 results
  without `search_context_size`, but explicit low/medium/high returned 400.
  A mixed-domain request returned 200, so do not promise upstream rejection.
- Keep synthetic fixture chains for controlled edge cases and add trimmed,
  scrubbed recordings from the authorized live validation.
- Add captured-wire tests because ordinary replay does not match bodies/headers.
- Require explicit `PERPLEXITY_LIVE_TESTS=1` as well as credentials to run the
  live test. Offline tests inject fake credentials and fake fetch.

## Non-goals

No Agent/Sonar API, content-snippets endpoint, SDK dependency, new engine hooks,
hosted credential provisioning, publication, or automatic retry policy.
Hosted activation and commercial/operational checks remain separate work.
