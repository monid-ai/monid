# Design: add-connector-specstream

Decision record for the SpecStream connector (new). Only the choices the
declarative model forced are recorded. The input schemas mirror the
public OpenAPI document (`https://specstream.ai/openapi.json`).

## D1: Four endpoints, the documented flow

A caller needs: read a request, see what it costs, run what was approved,
read the rows with their sources. That is `parse`, `capacity/quotes`,
`capacity/executions` and `finds/{id}/rows`. The quote is a signed
object (`quote_id`, `quote_hash`, `maximum_cents`) that the run must
echo, so the price is always seen before money moves. `finds/{id}/rows`
is the free way to read more than the first page the run returns.

Identity is inferred from `request.path`, except `finds/{id}/rows`, which
is the vendor path template. Ids: `specstream#v1/parse`,
`specstream#v1/capacity/quotes`, `specstream#v1/capacity/executions`,
`specstream#v1/finds/{id}/rows`.

## D2: Billing, and why it meters captured cents

SpecStream charges per matching row, and the rate is set by how much work
the row takes: 5 cents, 15 cents or 1 dollar, plus 5 cents for a person's
email and 15 cents for a phone. A row that does not match, and a run that
finds nothing, cost nothing (https://specstream.ai/pricing,
https://specstream.ai/agents.md; euro accounts pay the same numbers in
euros).

Two things make a per-row rate table the wrong model here:

- The tier is decided by the quote for the request, not by any field the
  caller sends. The same `confirm_max_cents` can buy 5 cent rows or $1
  rows.
- The settled receipt (`commerce`) gives one captured total, not tier and
  contact lines. A tier-by-tier model would have to guess its own
  evidence.

So the run endpoint uses a `PER_UNIT` model on `Unit.CREDIT` that meters
the cents SpecStream captured, one for one
(`consumes: { credit: "default", amount: 0.01 }`), the same posture as
`firecrawl#agent`:

- `usage.consolidate` reads the vendor's own claim,
  `commerce.amount_captured_cents`, and settles `cents / 100` dollars.
  An absent claim omits the entry, so the derived fold stands in.
- `usage.estimate` is `confirm_max_cents`. SpecStream reserves exactly
  that from the account before the find starts and refunds the rest, so
  the estimate is a real ceiling and never an overrun.
- `usage.evidence` reports the captured cents.
- The poll completes only when `commerce.settlement_status` is no longer
  `pending`, so a run is not claimed before its charge is final.

What this mapping gives up: Monid's usage line says "cents charged", not
"results at tier N". The per-tier rates are written in the endpoint's
`description` and in the quote's `terms`, which the caller sees before
approving. If a future receipt lists billed units by tier, the model can
move to per-tier evidence without changing the claim that settles.

The other three endpoints are `FREE` through the provider model, and the
tests assert zero usage on them, including `finds/{id}/rows`, whose
output carries the `commerce` receipt as data.

Euro accounts: SpecStream settles the same numbers in euros. The pool is
labeled US dollars as in the public price list; a euro account sees its
own currency on the quote.

## D3: The run is a durable job keyed by the caller's idempotency key

A find runs for minutes and up to four hours for the largest lists.
`start` POSTs the execution and parks RUNNING with the caller's
`idempotency_key` as the job handle: SpecStream reads a run back by that
key (`GET /v1/capacity/requests/{key}/rows`), and a retried start with
the same key never buys twice, so the run needs no other state.

`poll` reads that page. `done` and `retry_after_seconds` set the cadence
(`retry_after_seconds` is `null` once the find is done, so it is read
without a type gate). A 408, 429 or any 5xx status on the lookup keeps the run alive
rather than ending it, because the find keeps working and its charge is
reserved. Other non-2xx answers complete as data and the engine zero
bills them.

`stop` cancels the find (`POST /v1/finds/{id}/cancel`), which keeps the
rows already matched and charges for them. Settlement after a cancel is
asynchronous, so a stop that cannot yet see a settled receipt returns
`UNRESOLVED` and claims nothing.

## D4: Pagination is passed through

The run returns the first page of rows with `next_cursor`. The rest is
read with `specstream#v1/finds/{id}/rows` (free) using `find_id`, so the
poll does not walk pages and a large list does not inflate one run.

## D5: Required fields at the binding

`requested_units` on the quote defaults to 25 as the API does. The run
requires `quote_id`, `quote_hash`, `idempotency_key` (8 to 128
characters) and `confirm_max_cents`; the last one is what makes the
estimate an enforced ceiling.

## D6: Search and Extract, the two one-call endpoints

`v1/web-search` and `v1/extract` were added on 2026-11-14. They are the calls
an agent makes most: one request, one reply, no quote and no approval.

Both replies carry their own receipt, `data.price_usd`, the dollars taken for
that call, so `usage.consolidate` settles on it (D27), like the run settles on
`commerce.amount_captured_cents`. The prices are fractions of a cent ($0.005 a
search of up to 10 results, $0.001 a fast or news search, $0.0008 a page
read), so these two endpoints meter in hundredths of a cent
(`consumes.amount: 0.0001`) and every count is a whole number.

The estimate is the published price rule applied to the request: for search,
the base price plus one step for each started block of 10 results past 10;
for extract, every page asked for. A page that gives no text is not charged,
so an extract can settle under its estimate, never over it. An error reply
has no receipt and bills nothing.

Not mirrored: image search and its filters, and the extract form that reads
HTML the caller sends.
