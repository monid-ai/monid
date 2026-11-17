# Scrapeless connector — review preparation, not published

Baseline: `09d54479142e36eff876383beacfbd37b33b5908`.

The current owner-approved review batch is **five products, 22 endpoints**. This
directory loads through Monid's normal compiler without imports from `local/`,
vendor SDKs, framework changes, or paid resource registration.

| Product           | Operations                                                              | Count |
| ----------------- | ----------------------------------------------------------------------- | ----: |
| Google Search API | search, images, local, videos, shopping, news                           |     6 |
| AI Scraper        | Perplexity, Grok, ChatGPT, Gemini, AI Mode, AI Overview, Alexa, Copilot |     8 |
| Web Unlocker      | URL fetch with documented request, rendering and output options         |     1 |
| Amazon            | product, seller, keywords, Rufus                                        |     4 |
| TikTok            | user detail, user work, Shop product                                    |     3 |

All 22 have retained representative successful native responses. The mapping is
in `review-cases.ts`. Shared and per-product tests verify the compiled inputs,
native outputs, usage declarations and failure handling. This is not a claim
that every parameter combination, production SLA or actual invoice has been
verified. See `REVIEW.md` for validation and maintenance details.

## Rates and settlement

Standard USD list rates per request:

| Operations                      |    USD |
| ------------------------------- | -----: |
| Google Search API, Web Unlocker |  0.001 |
| ChatGPT, Copilot                |  0.002 |
| Alexa, Amazon, TikTok           |  0.003 |
| Other included AI engines       | 0.0018 |

Rate references:
[public actor prices](https://backend.scrapeless.com/app/api/v1/public/pricing/actors)
and [Scrapeless pricing](https://www.scrapeless.com/en/pricing). The 2026-10-23
actor-price snapshot uses `originalPrice`, not discounted `price`. The
authenticated existing `/app/api/v1/actors/pricing` response also supplies Alexa
and TikTok user-detail original rates. The project owner explicitly confirmed
all three TikTok operations at USD 0.003/request on 2026-10-23. That is
request-count billing, not a success-only supplier policy.

ChatGPT, Gemini, AI Mode and AI Overview accept shopping true, false or
omission. The documented shopping model is one base answer plus at most one
extra base charge when eligible nonempty native `task_result.products` is
present: **2x total, never per product**. Gemini defaults false; AI
Mode/Overview default true; ChatGPT follows its documented response-based rule.
ChatGPT estimates always reserve the possible 2x, even with shopping=false,
because its enrichment is response-based. Other engines retain their input-gated
estimates. Empty, null and absent product lists settle at base. Tests
distinguish retained native responses from explicitly synthetic branches;
declared usage is not a vendor invoice.

Monid counts one successful engine run once; internal polls do not count as new
submissions. Monid currently zero-settles error envelopes. This does **not**
mean the supplier request was free: preserve errors and task IDs, especially for
TikTok's request-based supplier charging. Do not fake a successful output to
change settlement. Platform failure-cost policy and retail margin remain Monid's
responsibility. No new downstream-user billing system is introduced.

These are declared catalog list rates, not vendor invoices, balance
reconciliation or negotiated account prices. `usage.consolidate` is omitted: no
per-response supplier receipt is claimed. Account discounts or negotiated
production prices require an explicit rate update.

## Execution and retained evidence

Synchronous results are validated as business results, not merely HTTP 200.
Pending HTTP 200/201 responses and asynchronous tasks keep the original task ID
and are polled without another POST. Ambiguous submission transport failure is
reported as unknown: callers must not automatically resubmit. Poll transport
errors and applicable transient statuses have bounded retries, under the overall
run budget. A status response cannot silently replace the task ID.

AI task results have a documented four-minute retention period; the running
connector retrieves them within the run, but does not provide durable external
task storage. These included actor APIs do not expose an upstream cancellation
flow in this implementation; cancelling a local run is not proof that the
supplier stopped work. Web Unlocker empty/omitted output selection is normalized
before submission. Native response fields, references and relevant failure
context are retained.

`options.test.ts`, `six-products.test.ts` (historical filename),
`review-readiness.test.ts`, `branches.test.ts` and product tests distinguish
recorded native responses from synthetic errors/options. No replay is
represented as a new live call.

The latest option/coverage map is in `CAPABILITIES.md`. Rufus flag/ASIN effects
have independent native comparisons. Known AI Mode share links now use bounded
credential-free redirect resolution before submission.

## Local checks and opt-in live testing

Required PR CI commands at the pinned baseline:

```sh
deno task check
deno task test
```

Compile separately with `deno task compiler:compile`. No key or network is
required for replay tests. The auxiliary ID-lock baseline issue is disclosed in
`REVIEW.md`; it is not part of the pinned PR CI workflow.

Keys come from the runtime. `SCRAPELESS_CREDENTIALS_API_KEY` takes precedence
over legacy `SCRAPELESS_API_KEY`, including when the canonical value is empty.
Keep any local `.env` ignored and private; never include it in a submission,
fixture or public log.

The presence of a key alone does not enable paid live tests. Select exactly one
full endpoint ID, after privately setting credentials:

```sh
SCRAPELESS_LIVE_ENDPOINT='scrapeless#google/search' deno task test:live connectors/scrapeless/live.test.ts
```

Optional `SCRAPELESS_LIVE_BODY` is a JSON request body override for a current
target; otherwise the recorded representative body is used. Live tests make a
paid vendor call only for the selected endpoint, do not load `.env`
automatically, and never overwrite fixtures. Run them only with a suitable
account and budget.

## Review and rollout are separate

A local package and passing tests are not a submission, approval or launch.
After explicit authorization, open the PR and provide the company name,
corresponding API docs and PR URL through Monid's documented review process.
Review/merge, catalog publication, Tools page listing and production acceptance
must be tracked separately. Credential supply, production limits, failure-cost
policy, contacts and release timing are coordinated before production rollout.
