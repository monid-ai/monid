# apify-connector (delta)

## ADDED Requirements

### Requirement: johnvc actors are pure endpoint data on the apify provider
Each of the 18 `apify#johnvc/*` docs SHALL declare `endpoint` as
`/johnvc/<folder>`, `request.path` as `/v2/acts/johnvc~<slug>/runs` with the
actor's real Store slug, an input binding over the scaffolded mirror, the
scaffolded output schema, and a `usage.model` whose lines are every event
the actor publishes, pinned at the Business-tier rate. No johnvc doc SHALL
declare a lifecycle, `input.toRequest`, `output.fromResponse` or
`usage.consolidate`.

#### Scenario: Shared chain settles the derived fold
- **WHEN** any johnvc doc replays the provider's `run-succeeded` chain with
  its `test-inputs.json` body
- **THEN** it settles 200 with usage equal to the model's fold over its
  `CHAIN_COUNTS` (or `{key: 2}` for single-metered docs), every flat line
  at 1, and two output rows

### Requirement: Flat fees named setup/startup and summed joins
The drift suite SHALL treat published events named `setup` or `startup` as
flat (once-per-run) lines, and SHALL compare a composite line's pinned
amount against the SUM of every published event whose normalized name is
the line's id.

#### Scenario: A setup fee with no start event
- **WHEN** an actor publishes `setup` and `apify-default-dataset-item` only
  and the doc models `setup` as `PER_CALL`
- **THEN** the shape check passes

#### Scenario: Two events on one id
- **WHEN** an actor publishes `apify-actor-start` at 0.00001 and
  `actor_start` at 0.00005
- **THEN** a line `actor_start` pinned at 0.00006 passes the rate check and
  a line pinned at 0.00001 is a rate finding naming both events

### Requirement: Estimates are deduced from the binding
Every johnvc doc's limiting knob SHALL be required at the binding or carry
the actor's verified published default; page caps the actor documents as
0 = unlimited SHALL be floored at 1. Input-gated lines SHALL appear in the
estimate only when their input switches them on, at the D24 floor 0 where
the quantity is unknowable pre-run.

#### Scenario: Mode selects the line
- **WHEN** `apify#johnvc/google-lens-api` is estimated with
  `search_type: "products"`, two `image_upload` entries and `max_results: 5`
- **THEN** the evidence is `{product_match_returned: 10, default_dataset_item: 10}`

#### Scenario: Pre-charged cap is the estimate and the evidence
- **WHEN** `apify#johnvc/us-congress-financial-disclosures-and-stock-trading-data` runs with
  `Max_Results: 7`
- **THEN** `transaction_processed` is 7 both before the run and at settle,
  whatever the row count
