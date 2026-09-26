# Insuron connector

This Deno 2 connector submits caller-attested insurance-matching objectives to
`https://insuron.io/api` and reads public statuses for requests owned by an
approved Insuron application. All usage is `FREE`.

## File map

- `provider.ts` — provider metadata, API base URL, and bearer auth.
- `endpoints/create-request/endpoint.ts` — `POST /requests`; strict input
  schema and run-stable `Idempotency-Key`.
- `endpoints/request-status/endpoint.ts` — `GET /client/requests/{id}`; UUID
  input validation and public-status output projection.
- `endpoints/*/fixtures/synthetic-*.json` — synthetic replay-only responses,
  including both 200 `needs_information` and 201 accepted outcomes.
- `provider.test.ts` — replay and validation tests. No live API test is
  included.

## Permission and safety gates

The submission schema requires `consent: true` and a non-empty
`consentReference`. These are a caller attestation and its audit reference;
neither Insuron nor this connector independently verifies consumer consent.
The caller is responsible for retaining auditable consent evidence.
Permission to share a request does **not** authorize phone calls or SMS. This
connector accepts no consumer name, phone, or email field and does not make
calls, create quotes, or issue policies. The free-text `objective` and
`consentReference` can still contain sensitive content; callers should avoid
sending unnecessary sensitive information.

The POST endpoint projects its response to public status fields and preserves
both API outcomes: HTTP 200 `needs_information` does not create a request;
HTTP 201 means accepted. The connector requires the current API's one
conditional field (`consentReference`) up front, so 200 is only expected if
Insuron adds more qualification requirements later. Status reads use only the
`/client/requests/{id}` application-scoped route, with a UUID id; the Insuron
API enforces ownership and returns 404 for requests not owned by the approved
application. The connector projects the response to public status fields.

The bearer credential scopes to an approved Insuron **APPLICATION**, not to a
Monid agent or workspace. Hosted Monid credential-to-application isolation is
**NOT VERIFIED**. Do not use the live network or share any credential until the
host confirms the credential-to-app mapping, Insuron has approved the
application, and the caller retains auditable consent evidence. Monid's
canonical environment convention for this provider's `apiKey` credential is
`INSURON_CREDENTIALS_API_KEY` (with the standard `INSURON_API_KEY` alias);
local testing uses synthetic test credentials only.