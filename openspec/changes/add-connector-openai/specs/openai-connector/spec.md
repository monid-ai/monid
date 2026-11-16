# openai-connector (delta)

## ADDED Requirements

### Requirement: Six stable public identities
The provider SHALL be `openai`, use bearer authentication against
`https://api.openai.com`, declare the `default` US-dollar credit pool and use
180s request / 240s run timeouts. It SHALL expose `/v1/image/gpt-image-2`,
`/v1/image/gpt-image-2.5-sunburst` and `/v1/image/gpt-image-2.5-flare`, each with
an additional `-edit` endpoint. Generation SHALL POST to
`/v1/images/generations`; edits SHALL POST to `/v1/images/edits`.

#### Scenario: Model identity survives shared native transport paths
- **WHEN** any of the six compiled endpoints executes
- **THEN** its distinct public identity selects its pinned model, while the
  request targets the appropriate native generation or edit path

### Requirement: Public input facade and bounded native request
Every binding SHALL require prompt, size and model-appropriate quality. Image 2
SHALL accept low/medium/high; Image 2.5 SHALL also accept xhigh/max. Background
SHALL be optional. Edits SHALL additionally require 1–16 public HTTPS URL
strings in images, with an optional HTTPS mask URL. Unknown keys SHALL be
rejected. Every wire request SHALL fix n=1, PNG encoding and streaming=false.

#### Scenario: Editing preserves reference order and mask semantics
- **WHEN** an edit receives multiple URL strings and a mask URL
- **THEN** images become ordered image_url objects and the mask becomes an
  image_url object; absent mask SHALL remain absent

#### Scenario: Caller cannot override cost-setting native controls
- **WHEN** a body includes model, n, output_format or stream
- **THEN** validation SHALL fail before any wire call

#### Scenario: Invalid dimensions never contact OpenAI
- **WHEN** a size violates 16px alignment, 3840px maximum edge, 3:1 maximum
  aspect ratio or the inclusive 655360–8294400 pixel range
- **THEN** an admission estimate SHALL return finite counts without IO or a
  function-contract error, and subsequent execution SHALL return an uncharged
  400 invalid_size error without IO

### Requirement: Token-based standard-rate billing
The rate card SHALL have input_text_token at $0.000005, input_image_token at
$0.000008 and output_image_token at $0.000030, each PER_UNIT TOKEN with every=1.
No batch, cached or streaming line SHALL be selected: these bindings call only
the synchronous direct Images API, whose inputs are not cache-discounted.
Successful billing SHALL use the native receipt, never the admission estimate.

#### Scenario: Fractional thousand-token blocks stay fractional
- **WHEN** the vendor reports one token in each of the three metered lines
- **THEN** the derived charge SHALL be $0.000043, not three rounded 1K blocks

#### Scenario: An error costs nothing
- **WHEN** OpenAI returns a non-2xx, or a 2xx containing an error
- **THEN** the run SHALL preserve the vendor error and settle with empty
  credits and evidence; a 2xx in-body error SHALL become a 502

#### Scenario: Missing or invalid receipt is not a successful paid run
- **WHEN** a 2xx has no b64_json image with valid Base64 syntax and a PNG
  signature, or its text/image/output token counts are missing, negative,
  non-integer or non-numeric
- **THEN** the run SHALL return invalid_response with 502 and zero usage

### Requirement: Estimates use input-derived counts
Output estimates SHALL reproduce the official model-specific calculator,
including ties-to-even rounding on the short latent edge. Prompt estimates
SHALL use UTF-8 bytes; edit reference estimates SHALL use the hosted catalog's
1500-token allowance per URL and a mask allowance when present. Documentation
SHALL distinguish these input approximations from exact receipts and SHALL NOT
promise a guaranteed admission ceiling.

#### Scenario: The two model families have different medium-quality counts
- **WHEN** size=1024x1024 and quality=medium
- **THEN** Image 2 SHALL estimate 1756 output tokens and both Image 2.5 models
  SHALL estimate 439; generation and edit SHALL agree on output counts

### Requirement: Honest native output and explicit host integration seam
The connector SHALL preserve native PNG base64, metadata and usage. It SHALL
NOT fabricate signed URLs. Documentation SHALL record that the host must store
the PNG and produce the hosted image artifact with seven-day retention, and
that the private adaptor and live vendor behavior remain unverified.

#### Scenario: Successful replay preserves the image and receipt
- **WHEN** a valid native success envelope settles
- **THEN** output SHALL equal the vendor envelope, including data[].b64_json,
  while usage SHALL be derived separately from the raw token receipt

### Requirement: Validation executes compiled artifacts
Offline tests SHALL compile and execute all six sealed units, verify transport
mapping/authentication, receipt billing, failure paths, estimates, schema
rejections and shared function interning. Fixtures SHALL be provider-level,
minimal and synthetic-prefixed. Live testing SHALL be credential-gated.
