# Proposal: add-connector-veille

## Why

Veille (https://www.veille.io) — Check emails, phone numbers and domains for fraud, and validate EU VAT numbers and IBANs. 6 synchronous GET endpoints, one API key, no new engine capability.

## What Changes

- **connectors/veille** — 6 endpoints, auth the `x-api-key` header, 60 s timeouts:
  - `veille#v1/intelligence/email` (`GET /v1/intelligence/email`, `people-enrichment`): Check an email address for fraud signals and a risk score. PER_CALL, 3 Veille credits.
  - `veille#v1/intelligence/emailq` (`GET /v1/intelligence/emailq`, `people-enrichment`): Verify an email address is deliverable, with an SMTP inbox test. PER_CALL, 5 Veille credits.
  - `veille#v1/intelligence/domain` (`GET /v1/intelligence/domain`, `company-enrichment`): Check a domain's mail setup and whether it is disposable. PER_CALL, 2 Veille credits.
  - `veille#v1/intelligence/phone` (`GET /v1/intelligence/phone`, `people-enrichment`): Check a phone number: validity, line type and carrier. PER_CALL, 1 Veille credits.
  - `veille#v1/vat` (`GET /v1/vat`, `company-enrichment`): Validate an EU VAT number and get the registered company. PER_CALL, 1 Veille credits.
  - `veille#v1/vat/iban` (`GET /v1/vat/iban`, `company-enrichment`): Validate an IBAN and get its bank and BIC. PER_CALL, 1 Veille credits.
- **Billing**: Veille bills credits per successful request: an email check 3 credits, an email verification with SMTP test 5, a domain check 2, a phone check, a VAT check and an IBAN check 1 each (published pricing; measured in the Treg catalog run, 2026-11-09). No response carries a usage receipt, so the derived fold settles.
- Fixtures: `synthetic-` happy and 401 chains, shaped from the vendor OpenAPI spec and live calls made for the Treg catalog (2026-11-09). Replace via `deno task record` when `VEILLE_API_KEY` exists.

## Capabilities

- `veille-connector`.

## Impact

New connector tree. No schema/engine contract change — `ENGINE_VERSION` unchanged, no new `Unit`, no new preset, no new hook, no new category leaf (`company-enrichment`, `people-enrichment` already exist).
