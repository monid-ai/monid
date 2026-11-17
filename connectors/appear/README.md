# Appear AI Readiness Scan

Scan a public site to see which facts are visible in its first HTML response,
how that compares with the rendered page, and what changes could improve
readability for AI crawlers. Try the
[interactive scan](https://joinappear.com/how-ai-sees-you).

## API

Send a JSON body to `POST https://joinappear.com/api/how-ai-sees-you`. The scan
is free and accepts requests without an account or API key.

```sh
curl --json '{"domain":"joinappear.com"}' https://joinappear.com/api/how-ai-sees-you
```

| Field    | Meaning                                                                                              |
| -------- | ---------------------------------------------------------------------------------------------------- |
| `domain` | Required string. A public hostname or HTTP(S) URL. The scan starts at the homepage of that host.     |
| `fresh`  | Optional boolean. Defaults to false, allowing a cached report. Set it to true to request a new scan. |

A successful JSON response contains `success: true` and a `result` object.

| Result field                                    | Meaning                                                                          |
| ----------------------------------------------- | -------------------------------------------------------------------------------- |
| `scannedAt`, `finalUrl`                         | Time of the scan and homepage reached after redirects.                           |
| `score.score`, `score.grade`, `score.diagnosis` | Overall readiness score, letter grade, and explanation.                          |
| `score.checks`                                  | Individual checks with supporting evidence and recommendations where applicable. |
| `pages`                                         | Sampled pages with coverage and facts missing from the first HTML response.      |
| `crawlerChecks`, `siteChecks`                   | Observed crawler responses and site-level checks.                                |

The Monid endpoint is `appear#how-ai-sees-you`. It returns the JSON report with
embedded page screenshots removed to keep the response small.

On error, the API returns a JSON object with an `error` message. HTTP 400
indicates invalid input. HTTP 429 indicates a rate limit. The public scan allows
up to 12 requests per IP per hour and 30 per domain per day. Wait for the
applicable window before retrying.
