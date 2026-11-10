# Data Legion

Six enrichment variants using two native POST routes. Each endpoint requires its
own API key, injected through the `API-Key` header. Search and discovery are
outside this connector's scope.

## Endpoints and credentials

Endpoint IDs below have the `datalegion#` prefix. Credential variables have the
`DATALEGION_CREDENTIALS_` prefix.

| Endpoint                       | Native route      | Credential variable suffix      | USD / successful call |
| ------------------------------ | ----------------- | ------------------------------- | --------------------: |
| `person/enrich/base-no-pii`    | `/person/enrich`  | `PERSON_BASE_NO_PII_API_KEY`    |                 0.013 |
| `person/enrich/base-pii`       | `/person/enrich`  | `PERSON_BASE_PII_API_KEY`       |                 0.065 |
| `person/enrich/premium-no-pii` | `/person/enrich`  | `PERSON_PREMIUM_NO_PII_API_KEY` |                 0.052 |
| `person/enrich/premium-pii`    | `/person/enrich`  | `PERSON_PREMIUM_PII_API_KEY`    |                 0.104 |
| `company/enrich/base`          | `/company/enrich` | `COMPANY_BASE_API_KEY`          |                 0.013 |
| `company/enrich/premium`       | `/company/enrich` | `COMPANY_PREMIUM_API_KEY`       |                 0.052 |

Each compiled endpoint accepts only its own credential. There is no fallback to
a shared key. Configure credentials in the calling environment or the
deployment's secret store; do not put key values in source or request bodies.
Field access is enforced by the provider for the selected key.

## Billing

Rates follow the supplied Data Legion API Access — Pay-As-You-Go contract,
rather than public record-based pricing. The `default` credit system is
denominated in USD. A successful response with a nonempty `matches` array
consumes one call's rate, irrespective of record count. Empty matches and
non-2xx responses consume zero. Estimates reserve one call's rate.

`RESULT` evidence is binary because the contract charges per successful matched
call. A flat `PER_CALL` model would also bill empty successful responses. No
provider-reported usage claim is synthesized from response fields.

## Usage

Run from the repository root after configuring the selected endpoint's
credential:

```sh
deno task engine:run 'datalegion#person/enrich/base-no-pii' --body '{"email":"person@example.com","limit":1}'
deno task engine:run 'datalegion#company/enrich/premium' --body '{"domain":"example.com","limit":1}'
```

Replace example identifiers with an authorized test subject. Person enrichment
accepts a direct identifier or a name with matching context; company enrichment
requires a supported company identifier. The provider validates identifier
combinations. `limit` is optional and restricted to 1–10 when supplied;
`multiple_results` requires the corresponding provider entitlement.

## Verification

```sh
deno task check
deno test --allow-read --allow-env --allow-write connectors/datalegion connectors/pdl
deno lint connectors/datalegion
deno fmt --check connectors/datalegion
```

Fixtures are synthetic. Offline tests cover request construction, isolated
credentials, input validation, estimates, matched-call billing, empty responses,
and provider errors. Live tests require both the matching credential and an
explicit flag:

```sh
deno test --allow-read --allow-write --allow-env --allow-net=api.datalegion.ai connectors/datalegion -- --live-datalegion
```

Live tests may consume credits. Example identifiers may return 404; validating
field entitlements requires known matching subjects.

The request audit exercises environment resolution with six distinct dummy keys
and a mocked network boundary. Run it in a disposable environment; it replaces
credential variables in its own process:

```sh
deno test --allow-read --allow-write --allow-env connectors/datalegion/request-audit.test.ts -- --isolated-request-audit
```

Live acceptance remains pending: manual requests returned HTML 403 responses,
including requests made directly with curl. Offline verification does not
establish that production credentials, field entitlements, or vendor billing are
valid. Confirm the rejection reason with the provider before production rollout.

## References

- [Person enrichment](https://www.datalegion.ai/docs/api-reference/person-enrichment)
- [Company enrichment](https://www.datalegion.ai/docs/api-reference/company-enrichment)
- Supplied contract rate card and credential access matrix.
