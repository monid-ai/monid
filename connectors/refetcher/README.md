# Refetcher

Eleven tools call Refetcher's existing social-data API. Their catalog paths are
logical tool identities; every request goes to
`POST https://api.refetcher.com/`.

| Endpoint id                        | Target       | Resource                    |
| ---------------------------------- | ------------ | --------------------------- |
| `refetcher#instagram/post`         | `url`        | Post or Reel                |
| `refetcher#instagram/profile`      | `username`   | Profile                     |
| `refetcher#tiktok/video`           | `url`        | Video                       |
| `refetcher#tiktok/profile`         | `username`   | Profile                     |
| `refetcher#facebook/post`          | `url`        | Post or Reel                |
| `refetcher#facebook/profile`       | `username`   | Profile                     |
| `refetcher#x/post`                 | `url`        | Post                        |
| `refetcher#x/profile`              | `username`   | Profile                     |
| `refetcher#youtube/video`          | `url`        | Video or Short              |
| `refetcher#youtube/channel`        | `channelUrl` | Channel metadata            |
| `refetcher#youtube/channel-videos` | `channelUrl` | Recent uploads with metrics |

## Credentials and execution

Provide an existing Refetcher API key through `REFETCHER_CREDENTIALS_API_KEY`.
The engine injects it as `X-API-Key`. `REFETCHER_API_KEY` is the standard legacy
alias; the canonical variable takes precedence. Keep keys out of source,
fixtures and pull requests.

From the repository root, after setting the environment variable:

```bash
deno task catalog endpoints --provider refetcher
deno task catalog inspect 'refetcher#instagram/profile'
deno task engine:run 'refetcher#instagram/profile' \
  --body '{"username":"nasa","includeRecentPosts":true,"pages":1}'
deno task engine:run 'refetcher#youtube/channel-videos' \
  --body '{"channelUrl":"https://www.youtube.com/@NASA","recentVideosLimit":12}'
```

## Scope and cost

Each run has one target. Social profile tools fetch one page, and YouTube
channel tools allow at most twelve recent uploads. A successful run costs one
unit at the published rate of **$0.0009 USD** ($0.90 per 1,000). Pre-run
estimates assume success; settlement checks the returned target result. HTTP
errors and failed target results cost zero, including a failure carried inside
an HTTP 200 response.

The response keeps Refetcher's normalized envelope. Null values and availability
markers retain their meaning; CDN media links may expire. Pagination metadata
can indicate that more results exist, but these tools do not follow continuation
cursors. A profile page is not a complete history.

Batch requests, additional pages, people search and account balance are outside
this initial connector. Account balance would reveal the hosted provider
account's funds, so it is not a public tool. This integration needs an API key,
request/response schemas and usage rules; it does not include Refetcher's
billing system or server source. Hosted credentials and any negotiated rates,
commission or payment arrangements are separate onboarding matters.

Public sources: [API documentation](https://www.refetcher.com/docs) and
[pricing](https://www.refetcher.com/pricing), reviewed 2026-09-22.

## Validation status

All eleven tools passed a live smoke test on 2026-09-22 through the compiled
engine in recording mode. Each made one request, returned HTTP 200 with a
successful target result, and settled $0.0009 USD. The complete run took
approximately 47 seconds. Profile cases requested recent posts, and the YouTube
channel case requested recent uploads, within the one-page/twelve-upload bounds.
This verifies those targets at that time; it does not establish an SLA or
availability for every target.

Four scrubbed `recorded-*-success.json` fixtures cover a YouTube video, an
Instagram profile, a YouTube channel and its uploads. The `synthetic-*` fixtures
retain constructed boundary and error cases. `fixtures/unauthorized.json` is a
real HTTP 401 response from an unauthenticated request; no key was sent and no
paid scrape ran for that fixture. Final offline verification passed: 1,157
repository tests passed, zero failed and 201 credential-gated live tests were
skipped. The focused connector suite passed sixteen tests with one live test
skipped. Type checks, connector formatting/lint, deterministic
double-compilation, version checks and catalog inspection also passed.

Live tests require both the credential environment variable and
`REFETCHER_LIVE_INPUTS`, a JSON object mapping logical endpoint paths to native
request bodies. They skip when either is absent. With a dedicated key already
set, supply a current public target and run:

```bash
export REFETCHER_LIVE_INPUTS='{"youtube/video":{"url":"https://www.youtube.com/watch?v=VALID_ID"}}'
deno task test:live --filter 'refetcher live'
```

Replace `VALID_ID` with a real current video id before running. Successful live
tests incur the published API charge. Hosted activation and the commercial
arrangement still require maintainer confirmation.
