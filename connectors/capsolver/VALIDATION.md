# Validation record

Updated: 2026-11-03. Live demo recordings below are dated 2026-10-30.

Upstream base: `09d54479142e36eff876383beacfbd37b33b5908`. The upstream main
branch was checked against this commit during preparation.

## Automated coverage

The submission includes an `endpoint.test.ts` for each of the three endpoints,
shared lifecycle tests in `provider.test.ts`, and recorder regression tests in
`shared/testing/body-credentials.test.ts`. The tests execute compiled sealed
units, assert outgoing JSON and credentials at the transport boundary, and
replay every recorded exchange without real network access.

Coverage includes immediate and polled completion, optional input mapping,
idle/processing transitions, HTTP and business errors, malformed error IDs,
missing/blank/wrong-family tokens, unknown polling status, missing task IDs,
strict input validation, output extensions, and exact success/error usage.
Recorder tests verify redaction before the sink, nested key variants, legacy
scrubbing, idempotence, and unchanged live request/response bodies.

Reproduce from an integrated Monid checkout with dependencies cached:

```sh
deno task check --cached-only
deno task test --cached-only --deny-net
```

Live checks are skipped unless explicitly enabled with `CAPSOLVER_LIVE_TESTS=1`
and a provider credential. Turnstile also requires a non-dummy demo widget URL
and site key. See [README.md](README.md#automated-tests-and-fixtures) for
focused commands and recording instructions.

## Recorded fixture provenance

The 2026-10-30 fixture refresh used the compiled connector through Monid's
`runEndpoint` record mode and the shared recorder, trim, and scrub functions:

- reCAPTCHA v2: four recorded exchanges, ending in HTTP 200 with a ready token.
- reCAPTCHA v3: two recorded exchanges, ending in HTTP 200 with a ready token.

These fixtures retain request ordering, methods, URLs, task IDs, statuses, and
response fields. API credentials are redacted before reaching the recording
sink; expiring solution values are replaced with inert placeholders before
publication. The six additional fixtures are labeled `synthetic-` and cover
success and failure boundaries. The primary reCAPTCHA success replays are backed
by real demo recordings. Turnstile success and failure fixtures are synthetic.
Their demo inputs use `https://demo.turnstile.workers.dev/` and its dummy site
key, `1x00000000000000000000AA`. Provider replies, task IDs, tokens, and
user-agent data are fabricated and do not establish live solver behavior. All
published challenge inputs use public demo sites or reserved example domains; no
production-site recording is included. A real successful Turnstile demo
recording remains to be added.

The unrelated Windows path change in `scripts/lib.ts` has been removed from the
submission. On this upstream base, catalog/record/engine CLI commands should run
on Linux, macOS, or WSL. Offline tests use their own portable shared runner.

## Existing identity-lock drift

The repository-wide `deno task ids:check` does not pass on the selected upstream
base. A separate untouched checkout was compiled to compare it with the final
submission:

- 78 compiled endpoint identities are absent from the upstream lock.
- 7 locked identities are absent from the upstream compiled catalog.
- The submission has exactly the same unrelated differences.
- The only lock additions in this patch are the three CapSolver endpoints.

For example, the base lock uses `bytedance#seedance-2.0` while its current
definition compiles to `bytedance#v1/video/seedance-2.0`. The package does not
rewrite unrelated providers' public identities to hide this baseline issue. This
guard failure is separate from the passing type/compiler checks and
CapSolver-specific identity validation.

## Historical live integration

Before the final readability-only revision, the same connector behavior was
exercised through a local stdio MCP adapter backed by the Monid compiler and
engine. The adapter is not part of this submission.

At 2026-10-30 02:13 UTC, the Google demo page supplied:

```json
{
    "websiteURL": "https://www.google.com/recaptcha/api2/demo",
    "websiteKey": "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-",
    "pageAction": "action"
}
```

The action came from the page's `data-action` and anchor `sa` value.

Observed results:

| Layer                  | Result                                          |
| ---------------------- | ----------------------------------------------- |
| Local MCP              | `RUNNING` followed by `COMPLETED`               |
| CapSolver              | HTTP 200, numeric `errorId: 0`, `status: ready` |
| Solution               | Non-empty reCAPTCHA token, 2,617 characters     |
| Solver elapsed time    | 6,067 ms                                        |
| Target form submission | HTTP 200                                        |
| Target response text   | `Verification Success... Hooray!`               |
| Total elapsed time     | 8,275 ms                                        |

The form was submitted from the same browser session by POSTing its fields and
the fresh `g-recaptcha-response` to the observed form action. The returned HTML
contained:

```html
<div class="recaptcha-success">Verification Success... Hooray!</div>
```

This establishes acceptance by that demo page for that run. No API key, full
solution token, session cookie, or local machine path is included here. The
engine reported `credits.default = 0.0008`; a provider wallet balance difference
was not measured.

## Hosted availability and remaining coverage

Monid's hosted MCP transport, authentication, discovery, and a free run/query
flow were verified separately. On 2026-10-30, the review account's inspect calls
for all three CapSolver endpoints returned endpoint-not-found. That is evidence
about this account's visible catalog, not a claim about every Monid deployment.

Hosted CapSolver publication, server-side credential provisioning, hosted
success/error/timeout/billing checks, and live v3/Turnstile target-page
acceptance remain unverified. The v3 success recording proves provider
completion only; Turnstile success coverage is synthetic. Automated tests and
replay fixtures are included; local MCP adapters and browser automation are
outside this submission.
