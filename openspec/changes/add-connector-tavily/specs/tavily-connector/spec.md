# tavily-connector (delta)

## ADDED Requirements

### Requirement: Four declarative endpoints
The provider SHALL expose search, extract, crawl and map as synchronous POST
operations against `https://api.tavily.com`, using bearer authentication and
`X-Client-Name: monid`. Credentials SHALL remain in the transport boundary.

#### Scenario: Execute any endpoint
- **WHEN** a compiled endpoint runs
- **THEN** its native path and validated input reach the provider with bearer
  authentication and `include_usage: true`, regardless of the caller's value
- **AND** a caller-supplied body `api_key` SHALL be removed

### Requirement: Native schemas and explicit bounds
Input mirrors SHALL preserve vendor fields and optionality without defaults.
Bindings SHALL require `limit` for crawl/map and apply the documented basic
extraction default. Search SHALL preserve omitted depth/topic so auto-parameter
selection is not disabled. Extract SHALL accept one URL or an array of 1–20.

#### Scenario: Invalid input
- **WHEN** a caller exceeds a documented field bound or omits crawl/map limit
- **THEN** validation SHALL reject before transport

#### Scenario: Advanced REST options
- **WHEN** a caller supplies documented advanced options, including domain/date/language filters, traversal controls, nested Research output schemas or files
- **THEN** those fields SHALL survive compiled validation and request mapping
- **AND** their catalog descriptions SHALL explain dependencies and managed fields
- **AND** optional tracking headers SHALL NOT be advertised as working body fields while the per-call interface has no header channel

### Requirement: Native credit receipts determine settlement
The model SHALL meter Tavily CREDIT units at one native credit per unit.
Receipt-based evidence SHALL honor zero without a calculated fallback.
The usage receipt SHALL be consolidated out of output; all other fields,
including partial failures, SHALL remain unchanged.

#### Scenario: Account accumulation has not reached a billing threshold
- **WHEN** a successful response reports `usage.credits: 0`
- **THEN** the result SHALL settle with empty credits and evidence

#### Scenario: Malformed or absent receipt
- **WHEN** a successful response lacks a finite nonnegative number `usage.credits`
- **THEN** the run SHALL fail its contract rather than invent a charge

#### Scenario: Vendor error
- **WHEN** Tavily returns non-2xx
- **THEN** its status and payload SHALL pass through with zero usage

### Requirement: Input-derived estimates
Search SHALL estimate one credit for basic/fast/ultra-fast and two for advanced.
Auto selection without explicit depth SHALL reserve two. Extract SHALL estimate
one or two credits per started block of five requested URLs. Map SHALL estimate
one or two per started block of ten allowed pages, depending on instructions.
Crawl SHALL sum the mapping and extraction estimates for its limit. These are
admission estimates, not settlement; only the vendor knows account carry-over.

#### Scenario: Explicit depth wins over auto selection
- **WHEN** auto_parameters is true and search_depth is basic
- **THEN** the estimate SHALL be one credit and the explicit value SHALL pass through

### Requirement: Offline and live evidence stay distinct
Tests SHALL execute compiled sealed units, cover request/auth mapping, estimates,
zero/nonzero receipts, errors and validation. Fixtures SHALL be marked synthetic.
Live tests SHALL be credential-gated; manual E2E verification SHALL precede a PR.

### Requirement: Research lifecycle and existing-job reads
Research SHALL submit once with stream=false, retain request_id in lifecycle
state, and poll GET /research/{request_id}?include_usage=true. Pending and
in_progress SHALL continue polling. Completed results SHALL settle their
native receipt; failed results SHALL become zero-billed 502 provider errors.
Transient HTTP polling errors SHALL keep the job running without resubmission.
Research SHALL reserve the published model maximum: mini 110, pro/auto 250.
The standalone status reader SHALL preserve the historical receipt and remain
FREE. Local cancellation SHALL NOT claim to stop the remote job.

#### Scenario: Completed research
- **WHEN** submission returns 201, polls return 202, then status=completed
- **THEN** the run SHALL return the report, sources and final native usage

#### Scenario: Existing job read
- **WHEN** the status endpoint returns a receipt for an existing research task
- **THEN** that historical receipt SHALL remain in output, with zero new usage

#### Scenario: Local interruption
- **WHEN** a host stops a running Research job
- **THEN** the outcome SHALL be STOPPED_UNSETTLED without a cancellation request
- **AND** the last lifecycle state SHALL retain the external request ID for recovery
- **AND** the run helper SHALL stop polling at its deadline without submitting another job

#### Scenario: Fractional native receipt
- **WHEN** a vendor receipt reports a finite nonnegative fractional amount
- **THEN** its exact amount SHALL settle; any rounded engine fold SHALL appear
  only as mismatch evidence, not replace the native claim
