# CapSolver connector

This connector adds proxyless CAPTCHA token tasks to Monid. It calls CapSolver's
REST API through the existing Monid transport and async engine.

| Endpoint              | CapSolver task type          | Token field                   |
| --------------------- | ---------------------------- | ----------------------------- |
| `/solve/recaptcha-v2` | `ReCaptchaV2TaskProxyLess`   | `solution.gRecaptchaResponse` |
| `/solve/recaptcha-v3` | `ReCaptchaV3TaskProxyLess`   | `solution.gRecaptchaResponse` |
| `/solve/turnstile`    | `AntiTurnstileTaskProxyLess` | `solution.token`              |

The provider name is `capsolver`. Local catalog IDs use the form
`capsolver#solve/recaptcha-v2`; hosted API and MCP calls use the provider and
endpoint as separate arguments.

## Credentials

Set `CAPSOLVER_CREDENTIALS_API_KEY` in the process that executes the connector.
The existing engine also accepts `CAPSOLVER_API_KEY` as a fallback. A defined
canonical variable takes precedence, including when it is empty.

The transport injects the key as JSON `clientKey` into both task creation and
same-origin polling requests. Callers must not place a key inside endpoint
input. The connector does not keep credentials in lifecycle state.

A Monid API key authenticates a client to Monid. A CapSolver key authenticates
the executing connector to CapSolver. A local CapSolver environment variable is
not automatically available to Monid's hosted executor.

## Inputs

All three endpoints require a JSON body with:

| Field        | Type             | Meaning                                     |
| ------------ | ---------------- | ------------------------------------------- |
| `websiteURL` | URL string       | Full URL of the page containing the widget. |
| `websiteKey` | Non-empty string | Public site key from that widget.           |

Inputs reject unknown body fields. Optional values are forwarded without adding
defaults; omit values that are absent from the target page.

### reCAPTCHA v2

| Optional field        | Type             | Meaning                                        |
| --------------------- | ---------------- | ---------------------------------------------- |
| `isInvisible`         | Boolean          | The page uses an invisible v2 widget.          |
| `pageAction`          | Non-empty string | The `sa` value in the widget's anchor request. |
| `recaptchaDataSValue` | String           | The `s` value for standard v2.                 |
| `isSession`           | Boolean          | Request CapSolver session mode.                |
| `apiDomain`           | String           | Domain used to load reCAPTCHA.                 |

An action is not exclusive to v3. For v2, send `pageAction` when the observed
anchor request includes `sa`; do not invent an action. The Google demo used in
the live verification supplied `data-action="action"` and `sa=action`.

Reference:
[CapSolver reCAPTCHA v2](https://docs.capsolver.com/en/guide/captcha/ReCaptchaV2/).

### reCAPTCHA v3

Optional fields are `pageAction`, `isSession`, and `apiDomain`. Use the page's
`grecaptcha.execute` action when it is present. This endpoint uses the standard
v3 task type and does not accept a requested score or select Enterprise/M1
variants.

Reference:
[CapSolver reCAPTCHA v3](https://docs.capsolver.com/en/guide/captcha/ReCaptchaV3/).

### Turnstile

Optional `action` and `cdata` strings map to `metadata.action` and
`metadata.cdata`. When both are absent, the connector omits `metadata`. The task
type is fixed; no `metadata.type` is sent.

Reference:
[CapSolver Turnstile](https://docs.capsolver.com/en/guide/captcha/cloudflare_turnstile/).

## Run locally

From the Monid repository root, with Deno 2 installed:

```sh
deno task catalog endpoints --provider capsolver
deno task catalog inspect 'capsolver#solve/recaptcha-v2'
```

After setting the CapSolver environment variable, run a real v2 task:

```sh
deno task engine:run 'capsolver#solve/recaptcha-v2' \
  --body '{"websiteURL":"https://www.google.com/recaptcha/api2/demo","websiteKey":"6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-","pageAction":"action"}'
```

The engine returns its result envelope, including `httpStatus`,
`isProviderError`, `output`, `usage`, and timing. The solution token is inside
`output.solution`. The command makes a real provider request and uses the
configured CapSolver account.

## Use through hosted MCP after publication

Publishing the connector requires Monid to deploy the catalog and configure the
provider credential. Adding the MCP URL to a client does not publish local
source code. On 2026-10-30, the review account's hosted catalog did not expose
these endpoints.

After publication, call `monid_inspect` first:

```json
{ "provider": "capsolver", "endpoint": "/solve/recaptcha-v2" }
```

Then call `monid_run` using the returned schema:

```json
{
    "provider": "capsolver",
    "endpoint": "/solve/recaptcha-v2",
    "input": {
        "body": {
            "websiteURL": "https://www.google.com/recaptcha/api2/demo",
            "websiteKey": "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-",
            "pageAction": "action"
        }
    }
}
```

Use the returned Monid `runId` with `monid_get_run` while the run is active.
CapSolver's `taskId` is managed internally and is not interchangeable with
Monid's run ID. Check provider errors even when a hosted run is `COMPLETED`.

The provider layer is a native REST connector. It does not host a separate MCP
server or connect to CapSolver's MCP server. Monid's host supplies the MCP
layer.

## Lifecycle and errors

1. Validate the input and map it to a fixed CapSolver task type.
2. Inject credentials in the transport and call `POST /createTask`.
3. Retain only the external task ID as connector-owned lifecycle state.
4. Poll `POST /getTaskResult` while status is `idle` or `processing`.
5. Accept `ready` only with numeric `errorId: 0` and the expected non-empty
   string token. Preserve the provider's solution and additional output fields.

| Response condition                                         | Connector result                                     |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| Provider HTTP error                                        | Preserve the HTTP status and response.               |
| Positive numeric `errorId`                                 | Logical HTTP 422; preserve the original HTTP status. |
| Missing or invalid success `errorId`                       | Logical HTTP 502 with `INVALID_PROVIDER_RESPONSE`.   |
| `ready` without the expected non-empty token               | Logical HTTP 502 with `INVALID_PROVIDER_RESPONSE`.   |
| Unknown polling status                                     | Logical HTTP 502; preserve the provider response.    |
| Task creation with a missing, non-string, or empty task ID | Non-retriable lifecycle error.                       |

The engine classifies provider errors and settles their usage to zero. Transport
and lifecycle execution failures follow the engine's error handling. An output
schema documents fields; it does not replace validation before usage settlement.

Requests allow 30 seconds each, with a 300-second run budget and a 3-second poll
interval. CapSolver documents a five-minute result window and at most 120 result
queries per task. The connector does not expose a cancellation operation; a
local timeout is not a claim that CapSolver cancelled or refunded the external
task.

References: [createTask](https://docs.capsolver.com/en/guide/api-createtask/)
and [getTaskResult](https://docs.capsolver.com/en/guide/api-gettaskresult/).

## Usage accounting

The `default` credit pool represents US dollars. The configured standard rate
per completed task is 0.0008 for v2, 0.001 for v3, and 0.0012 for Turnstile.
These are declared rates, not wallet receipts or guarantees of hosted pricing.
Provider errors and malformed success responses must not settle a successful
call.

## Recording credentials

Apply the accompanying `shared/testing/fixtures.ts` change with this connector.
It redacts JSON keys normalized to `clientkey` from request and response copies
before they enter the recording sink, and when older recordings are scrubbed.
Nested objects, arrays, case differences, underscores, and hyphens are handled.
Live request/response bodies remain unchanged.

The rule covers the known JSON credential field; it is not a general scrubber
for secrets embedded in arbitrary text. Solution tokens remain available to
recording/replay consumers. The shared regression tests verify redaction before
the recording sink, recursive scrubbing of older recordings, and unchanged live
request/response bodies. Committed recordings replace expiring solution values
with inert placeholders after capture.

## Source layout

- `provider.ts`: authentication, lifecycle, error mapping, and credit metadata.
- `schema/common.ts`: shared website fields and provider output schemas.
- `endpoints/*/schema/inputs.ts`: endpoint-specific input fields.
- `endpoints/*/endpoint.ts`: task mapping, endpoint metadata, and declared rate.
- `endpoints/*/endpoint.test.ts`: endpoint replay, request mapping, and gated
  live tests.
- `provider.test.ts`: shared lifecycle, malformed-response, input, and usage
  tests.
- `testing.ts`: compiled-artifact replay with full JSON request assertions.
- `fixtures/*.json`: shared recorded chains and explicitly named synthetic
  cases.

Lifecycle hooks must be closed-term functions because the compiler serializes
them independently. Success validation appears in both start and poll hooks for
this reason. No engine ABI or core contract changes are introduced.

## Automated tests and fixtures

Run from a full Monid checkout with dependencies cached:

```sh
deno task check --cached-only
deno task test --cached-only --deny-net
```

The second command explicitly denies network access. Replay uses a test
credential and requires no CapSolver account or network connection. For a
focused run:

```sh
deno task test --cached-only --deny-net connectors/capsolver shared/testing/body-credentials.test.ts
```

Each endpoint tests its compiled sealed unit. The replay wrapper verifies the
complete outgoing JSON, transport-injected `clientKey`, one JSON Content-Type,
polling task IDs, and consumption of every recorded call. Lifecycle tests cover
immediate completion, idle/processing polls, HTTP and business errors, malformed
success responses, strict input validation, preserved extension fields, and
exact usage settlement.

| Fixture                                   | Provenance and coverage                                                                       |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| `recaptcha-v2-succeeded.json`             | Real compiled-connector recording from Google's v2 demo, 2026-10-30                           |
| `recaptcha-v3-succeeded.json`             | Real compiled-connector recording from Google's v3 demo, 2026-10-30                           |
| `synthetic-turnstile-demo-succeeded.json` | Synthetic success with public demo inputs and no optional metadata; not a live recording      |
| `synthetic-turnstile-demo-rejected.json`  | Synthetic task creation and polling failure with Cloudflare demo inputs; not a live recording |
| `synthetic-recaptcha-succeeded.json`      | Shared reCAPTCHA polling, token, and output-extension cases                                   |
| `synthetic-turnstile-succeeded.json`      | Turnstile token and metadata mapping; not a real success recording                            |
| `synthetic-start-rejected.json`           | HTTP 200 business rejection during task creation                                              |
| `synthetic-poll-rejected.json`            | HTTP 200 business rejection during polling                                                    |

The real recordings use Monid's compiled-unit `runEndpoint` record mode and its
shared `recordingFetch`, `trimCalls`, and `scrubCalls` pipeline. Request order,
methods, URLs, task IDs, HTTP statuses, and response structure are preserved.
Credentials are redacted before entering the sink; expiring solution values are
replaced with inert placeholders before publication. Synthetic fixtures are
explicitly prefixed and described; tests derive malformed variants in memory.

All published challenge inputs use public demo sites or reserved example
domains. Turnstile demo fixtures use `https://demo.turnstile.workers.dev/` and
its always-pass dummy site key, `1x00000000000000000000AA`. See Cloudflare's
[testing guide](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).
Their provider responses, task IDs, tokens, and user-agent data are synthetic;
they establish neither live solver success nor rejection for that demo. No
production-site recording is included.

### Live checks and recording

Live tests require both a CapSolver credential and `CAPSOLVER_LIVE_TESTS=1`.
They are skipped by default, even when an account key is configured. For Bash:

```sh
export CAPSOLVER_CREDENTIALS_API_KEY="YOUR_CAPSOLVER_API_KEY"
export CAPSOLVER_LIVE_TESTS=1
deno task test:live connectors/capsolver
```

PowerShell uses `$env:CAPSOLVER_LIVE_TESTS = "1"`. The v2 and v3 live tests use
the public demo inputs in their endpoint test files. Turnstile additionally
requires `CAPSOLVER_TEST_TURNSTILE_WEBSITE_URL` and
`CAPSOLVER_TEST_TURNSTILE_WEBSITE_KEY` from a non-dummy demo widget. Set
`CAPSOLVER_TEST_TURNSTILE_ACTION` and `CAPSOLVER_TEST_TURNSTILE_CDATA` only when
present on that widget. Cloudflare's dummy key cannot stand in for a successful
solver task. Turnstile success and failure coverage is synthetic until non-dummy
demo recordings can be added.

To refresh a recording through Monid's CLI:

```sh
deno task record 'capsolver#solve/recaptcha-v2' happy --body '{"websiteURL":"https://www.google.com/recaptcha/api2/demo","websiteKey":"6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-","pageAction":"action"}'
```

The CLI writes `endpoints/recaptcha-v2/fixtures/happy.json`. Review the capture,
replace expiring solution values with inert placeholders, and promote the
minimized chain to the provider's `fixtures/` directory. Keep the `synthetic-`
prefix until a case is backed by a real recording.

On the pinned upstream base, use Linux, macOS, or WSL for the catalog, record,
and engine CLI. Its unrelated native Windows path conversion issue is outside
this connector patch. Offline tests use the shared test runner and do not depend
on that CLI path handling.

## Verification and scope

See [VALIDATION.md](VALIDATION.md) for the validation record and remaining
coverage. The reCAPTCHA endpoints have real provider-success recordings from
public demos. Turnstile includes synthetic success and failure coverage; a real
successful non-dummy demo recording remains to be added. Recorded v3 success
establishes provider completion; v3 and Turnstile target-page acceptance remains
unverified.

Browser ownership, challenge discovery, DOM manipulation, target-page
submission, proxy-based tasks, Enterprise variants, and v3 M1 variants are
outside this connector. A token must still be accepted by the target
application; a provider `ready` response alone does not establish that outcome.
