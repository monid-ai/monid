# Valyu

Two synchronous endpoints using the [Valyu API](https://docs.valyu.ai):

| Endpoint            | Purpose                                                      |
| ------------------- | ------------------------------------------------------------ |
| `valyu#v1/search`   | Ranked web, news, academic, and proprietary-source search    |
| `valyu#v1/contents` | URL content extraction, summaries, and structured extraction |

## Credentials

Set `VALYU_CREDENTIALS_API_KEY` (preferred), or the `VALYU_API_KEY` alias. The
engine injects `x-api-key` at the transport boundary. Obtain a key at
[platform.valyu.ai](https://platform.valyu.ai); never put it in request bodies.

## Examples

```sh
deno task engine:run 'valyu#v1/search' --body '{"query":"quantum error correction","search_type":"all","max_num_results":5}'

deno task engine:run 'valyu#v1/search' --body '{"query":"clonal hematopoiesis cardiovascular disease","included_sources":["valyu/valyu-pubmed"],"include_abstracts":true,"max_num_results":5}'

deno task engine:run 'valyu#v1/contents' --body '{"urls":["https://example.com"],"summary":true}'
```

Search exposes the standard 1–20 result limit. Most specialised and proprietary
sources require a subscription. Historical search accepts date or ISO date-time
bounds; date-times require `historical_cache: true`. Valyu validates cross-field
combinations (`fast_mode` is web-only; `url_only` requires web or news search).

Contents accepts 1–10 HTTP/HTTPS URLs and remains synchronous: `async: true`,
`webhook_url`, and unknown body fields are rejected. `summary` may be a boolean,
instructions (up to 500 characters), or a JSON schema. Duplicate URLs are
removed by Valyu and counted once in the estimate. HTTP 206 preserves per-URL
successes and failures; HTTP 422 represents all-failed extraction and zero
usage.

## Usage

The shared `default` credit pool is **US dollars**. Search's
`total_deduction_dollars` and Contents' `total_cost_dollars` settle the actual
bill and are removed from the top level of the output. Per-result prices and
nested content fields remain intact. When a receipt is absent, explicit result
prices are summed (only successful Contents results count). A present zero
receipt is authoritative. HTTP provider errors always settle zero usage.

Evidence records integer nanodollars under `CREDIT` at $0.000000001 per unit, so
the engine's whole-unit fold does not round fractional USD costs up to $1. The
vendor receipt remains authoritative, including finer precision.

**Search has no pre-run price quote or hold.** Its estimate is an empty usage
vector, not a promise that the call is free. Search prices depend on sources and
retrieved tokens. `max_price` limits CPM (cost per thousand tokens), **not total
dollars**, so it is not used as a fabricated total-spend estimate. Hosts
requiring a guaranteed admission hold should not treat this endpoint's empty
estimate as a spend cap.

Contents estimates $0.001 per unique URL, plus $0.001 when `summary` is enabled,
assuming all URLs succeed. The final receipt charges only successful processing.
`max_price_dollars` is Contents' total-dollar budget parameter.

## Verification

```sh
deno test --allow-read --allow-env --allow-write connectors/valyu
deno task catalog inspect 'valyu#v1/search'
deno task catalog inspect 'valyu#v1/contents'
```

Fixtures are explicitly synthetic, derived from the published API examples, not
live recordings. Live tests gate on the credential convention and require
network permission (`deno task test:live --filter valyu`). They consume account
credits. Answer, DeepResearch, and asynchronous Contents jobs are outside this
connector's initial scope. No engine or schema changes are required.

Sources:
[Search reference](https://docs.valyu.ai/api-reference/endpoint/search),
[Contents reference](https://docs.valyu.ai/api-reference/endpoint/contents).
