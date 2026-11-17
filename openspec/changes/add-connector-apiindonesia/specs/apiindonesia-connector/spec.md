# apiindonesia-connector (delta)

## ADDED Requirements

### Requirement: API Indonesia provider definition
The apiindonesia provider SHALL declare name `apiindonesia`,
`request.baseUrl` `https://use.apiindonesia.id/api/v1`, auth
`presets.auth.header("x-api-key")`, a single `default` credit pool labelled
"API Indonesia credits (1 credit = IDR 1)", and a provider-level
`output.fromError` that returns `error.message` (falling back to
"API Indonesia error"), `error.code` when present, and the raw body.

#### Scenario: Catalog surface
- **WHEN** the bundle is compiled
- **THEN** exactly these 19 ids exist under the provider:
  `apiindonesia#wilayah/search`, `#kodepos/search`, `#libur`, `#sholat`,
  `#sekolah`, `#kampus`, `#rumah-sakit/search`, `#gempa/terkini`,
  `#cuaca/search`, `#cuaca`, `#kurs-bi/latest`, `#merek/search`, `#halal`,
  `#bpom`, `#kbbi/word/{word}`, `#ump`, `#ojk/illegals`, `#lei`,
  `#hijriah/konversi`

### Requirement: Flat per-call billing
Every endpoint SHALL inherit the provider's leaf `PER_CALL` model consuming
2 `default` credits (the vendor rate card: 2 credits = IDR 2 per successful
request). There SHALL be no `consolidate`.

#### Scenario: Successful call
- **WHEN** any apiindonesia endpoint returns 200
- **THEN** usage is `{credits: {default: 2}, evidence: {CALL: 1}}`

#### Scenario: Errors are free
- **WHEN** the vendor answers 401, 400 or 404
- **THEN** the run completes as provider-error data with
  `{credits: {}, evidence: {}}` and the output carries the vendor `code`

### Requirement: Strict input mirrors
Each endpoint's query or path params SHALL mirror the vendor OpenAPI with
the vendor's required fields required (`q` on the search routes,
`kabupaten_id` on `sholat`, `tanggal` on `hijriah/konversi`, `word` on
`kbbi/word/{word}`), and SHALL reject unknown keys.

#### Scenario: Misspelled filter rejected
- **WHEN** a caller passes an unknown query key
- **THEN** the run fails with INVALID_INPUT before any network call
