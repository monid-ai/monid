# search1api-connector (delta)

## ADDED Requirements

### Requirement: Search1API provider definition
The search1api provider SHALL declare name `search1api`,
`request.baseUrl` `https://api.search1api.com`, auth
`presets.auth.bearer()`, a single `default` credit pool labelled
"Search1API credits", and a provider-level `output.fromError` that reads
`detail`, then `title`, then `message` from the error envelope.

#### Scenario: Catalog surface
- **WHEN** the bundle is compiled
- **THEN** exactly `search1api#search`, `search1api#news`,
  `search1api#crawl`, `search1api#sitemap`, and `search1api#trending`
  exist

### Requirement: Flat per-call billing
Every endpoint SHALL model `PER_CALL` consuming 1 `default` credit, with
no `consolidate` (the vendor reports no per-response meter — the derived
fold is the bill) and no quantities fns (meterless model ⇒ synthesized).

#### Scenario: Flat settle
- **WHEN** a `search1api#search` run returns 200
- **THEN** usage is `{credits: {default: 1}, evidence: {call: 1}}`

#### Scenario: Errors are free
- **WHEN** the vendor answers 401
- **THEN** the run completes as provider-error data with
  `{credits: {}, evidence: {}}`

### Requirement: Faithful input mirrors
`/search` and `/news` bodies SHALL mirror the vendor's OpenAPI object
variant — including the `""` enum entries (the documented "default
backend" spelling) — with `query` required. `/crawl` SHALL require `url`
and mirror `enableFallback`. `/sitemap` SHALL require `url` and mirror
`type` (`sitemap`|`all`). `/trending` SHALL require `search_service` —
enumerated `github`|`hackernews`, the only values the vendor documents —
and mirror optional `max_results`. Batch-array variants SHALL NOT be
exposed.

#### Scenario: Unknown engine rejected
- **WHEN** a caller passes `search_service: "not-an-engine"` to
  `search1api#search`
- **THEN** the run fails with INVALID_INPUT before any network call
