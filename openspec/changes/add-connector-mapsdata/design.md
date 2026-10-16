# Design: mapsdata connector

## D1: No by-id job endpoints

On the hosted platform every caller shares one MapsData workspace (one
vendor key). The vendor scopes job reads to the workspace, not to the
caller, so `GET /jobs/{id}`, `/jobs/{id}/download` and
`/jobs/{id}/cancel` would let any caller read, download or cancel another
caller's scrape given its id, and `GET /jobs` would list all of them.
Firecrawl exposes its job readers because its `next` cursor makes them
necessary; here the `/jobs` run already returns the complete deliverable,
so nothing is lost by leaving them out. `GET /usage` and `GET /clients`
describe the platform's own account rather than the caller's, and are left
out for the same reason. `client_id` is dropped from the body: it routes
between clients of one workspace and can only be wrong here. If
ownership-gated reads are wanted later, the resource lifecycle (D30+) is the
mechanism.

## D2: The poll follows the chain to the file

The vendor's terminal job record carries counts and flags, not rows; rows
live in a CSV on object storage behind a 15-minute signed URL from
`/jobs/{id}/download`. The poll fetches that link and then the file in the
same terminal tick. The file URL is cross-origin, so the engine sends it
BARE (D16), which is what a presigned URL needs and keeps the bearer key off
a third-party host. A 403 or 5xx on the file (an expired or flaky link) and
a 429/503 on the link mint both return RUNNING with a short `pollAfterMs`,
so the next tick mints a fresh link rather than failing a job that has
already finished and billed. The CSV is parsed in the fn (RFC 4180: quotes,
doubled quotes, embedded commas and newlines, CRLF or LF, BOM) into
string-valued rows keyed by the header. The payload is bounded by the
caller's own `total_limit`, unlike an open-ended crawl, so following the
chain is the right side of the trade the AGENT.md cursor gotcha describes.

## D3: Emails scope only

The vendor bills on rows with a deliverable email, and its emails-scope
export is exactly that set. Returning the all-rows export would hand back
rows the run does not bill, and xlsx would need a binary decode the engine
does not offer. One scope, matching the meter.

## D4: The claim is `job.email_count`, the evidence is delivered rows

`job.email_count` is the vendor's settle-time billing figure, read (not
plucked: it is also the caller's summary) as the D27 claim. Evidence counts
the rows actually returned. The two should agree; if they ever differ,
`usage.mismatch.derived` reports it and the claim settles, as D27 intends.

## D5: Cancellation is best-effort and unsettled

`stop` calls `POST /jobs/{id}/cancel`. The vendor bills leads already
delivered when a RUNNING job is cancelled; `stop` returns void
(`STOPPED_UNSETTLED`), so that partial draw is not settled to the caller.
Accepted for a first version: cancelling mid-scrape is rare, and settling it
properly needs a post-cancel read of the final `email_count`.
