# Proposal: add-connector-pangolinfo

## Why

Pangolinfo provides structured Amazon pages, buyer reviews, competing offers,
Rufus shopping answers and Google Maps businesses. A native connector makes
these APIs discoverable without an MCP intermediary. Its HTTP 200 business
errors and billed semantic outcomes require explicit lifecycle handling so
Monid settlement tracks the provider's debit.

## What Changes

- Add `connectors/pangolinfo`: ten synchronous endpoints, Bearer authentication,
  one native points pool, bounded inputs and explicit JSON parser bindings.
- Provider lifecycle maps unbilled business errors to HTTP errors while
  retaining billed semantic results and their complete response envelope.
- Vendor `pointCost` settles actual consumption; zero receipts also suppress
  derived units. Rufus counts answered turns when it reports no receipt.
- Add compiled artifact tests and explicitly synthetic shared fixtures; record
  real fixtures separately when a provider key is available.
- Register stable endpoint aliases in `connectors/ids.lock.json`.
- Correct the CLI's repository-root URL conversion with `fromFileUrl` so
  Windows paths such as `D:/newCode/monid` can run compile and identity checks.

No changes to the schema, engine ABI, categories or provider backend.

## Non-goals

- Dollar exchange rates and settlement agreements (hosted account settings).
- Arbitrary URL scraping, callbacks, background task submission, automatic
  pagination and retries.
- Dedicated variant expansion and Alexa Listing/question-discovery APIs.

## Capabilities

- `pangolinfo-connector`.
