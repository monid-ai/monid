# Change: Add six OpenAI image connectors

## Why

The hosted Monid catalog exposes GPT Image 2 and GPT Image 2.5 Sunburst/Flare
for generation and editing, but the public connector bundle has no OpenAI
provider. Adding their definitions lets the same generic engine compile and
execute those public identities with native OpenAI credentials.

## What changes

- Add the OpenAI provider, bearer authentication, image-appropriate timeouts
  and the US-dollar credit pool.
- Add six endpoints with the hosted paths and required prompt/size/quality
  inputs; edits accept 1–16 HTTPS references and an optional mask.
- Pin the model and one PNG per request; map reference URL strings into the
  native Images API's JSON objects.
- Model all three token-rate lines; share one typed estimate factory across the
  six bindings and settle on actual native token receipts with shared evidence.
- Reject unsupported dimensions before egress with 400 invalid_size. Admission
  estimates tolerate these inputs so the lifecycle can return that error. Relay
  vendor failures at zero usage; reject malformed successful envelopes.
- Add shared synthetic fixtures, sealed-unit integration tests and gated
  live smoke tests. Document native output and hosted integration requirements.

## Scope and migration limit

This is a connector-only change: no engine ABI, schemas, version or existing
provider changes. Sources are the six hosted `inspect` documents and official
OpenAI documentation checked 2026-10-17. The private `monid-services` adaptor
could not be read. Output therefore preserves native `data[].b64_json` and
usage. Hosted `image` artifact persistence and seven-day signed URLs remain the
host application's responsibility; their legacy behavior must be verified
before switching production traffic. This proposal does not claim full hosted
output parity or live vendor verification.
