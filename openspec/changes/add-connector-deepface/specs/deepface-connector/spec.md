# deepface-connector (delta)

## ADDED Requirements

### Requirement: Dedicated versioned provider contract
The provider SHALL use `https://api.deepface.dev`, transport-injected x-api-key,
and immutable `x-deepface-billing-profile: monid_v1`. Hosted activation SHALL
depend on a gateway which rejects mismatched/inactive profiles before compute,
a dedicated capped account, and agreed settlement/broker setup. The credential
SHALL NOT be an ordinary prepaid or Workweek account key.

The synchronous lifecycle relay SHALL make one request with the validated host
UUID as x-request-id, without retries or polling. The host SHALL preserve that
UUID across activity retries and reconcile provider-ledger charges after an
uncertain outcome. A duplicate 409 SHALL not be treated as a replay or as proof
that the original operation cost zero.

#### Scenario: Wrong account
- WHEN the gateway rejects the pricing profile with non-2xx
- THEN no credits are settled and the error is returned as data

### Requirement: Exact fixed rates
Successful `represent`, `verify`, and `compare` calls SHALL draw 1.02, 1.8, and
0.044 default credits respectively. At the proposed broker conversion of USD
0.001 per credit these are exactly 1020, 1800, and 44 integer microUSD. Estimates
and success settlement SHALL match. Non-2xx SHALL draw zero. No new meter hook
or engine billing code SHALL be added.

#### Scenario: Valid verification non-match
- WHEN verify returns HTTP 200 and verified:false
- THEN 1.8 credits are settled, because computation completed

### Requirement: Bounded, compiled workload validation
Bindings SHALL require an approved explicit model, reject unknown input keys,
remote URLs, file paths, unsupported encodings, and unpriced workload variants.
Image endpoints SHALL pin OpenCV, detection enforcement, alignment, and base
normalization. Compare SHALL require exactly one source_vector and one
target_vector, each of at most 512 numeric elements; image, batch, and async
variants SHALL not be exposed. Cross-field vector dimensions SHALL be validated
by the provider; the metadata SHALL disclose that requirement.

#### Scenario: Batch smuggled into vector tariff
- WHEN target_vectors, image, or async fields appear
- THEN compiled input validation fails before any wire call

### Requirement: Synthetic test provenance
Committed fixtures SHALL be explicitly synthetic and contain no real face
images, embeddings, credentials, or identifiers. Live tests SHALL be credential
gated and use synthetic vectors; authorized image validation SHALL be a separate
activation step, not a claimed outcome of replay tests.
