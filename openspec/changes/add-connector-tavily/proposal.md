# Change: Add the Tavily connector

## Why

Expose Tavily's web search, URL extraction, site crawling, URL mapping and research in
Monid's tool catalog.

## What changes

- Add `tavily#search`, `tavily#extract`, `tavily#crawl`, `tavily#map`, `tavily#research`, and the free
  `tavily#research/{request_id}` reader.
- Mirror the public request schemas and use bearer authentication.
- Request native credit receipts on billable runs and settle exactly that amount,
  including zero. Estimates use depth, URL count and explicit crawl/map limits.
- Add synthetic replay fixtures, credential-gated live tests, and manual E2E
  instructions. Register only the six new catalog identities.

No engine, compiler, existing connector or dependency changes are required.
The user will review and manually test this local change before a PR is opened.

## Sources

Checked 2026-10-26:

- https://docs.tavily.com/documentation/api-reference/openapi.json
- https://docs.tavily.com/documentation/api-reference/endpoint/search
- https://docs.tavily.com/documentation/api-reference/endpoint/extract
- https://docs.tavily.com/documentation/api-reference/endpoint/crawl
- https://docs.tavily.com/documentation/api-reference/endpoint/map
- https://docs.tavily.com/documentation/api-credits
- https://docs.tavily.com/documentation/api-reference/endpoint/research
- https://docs.tavily.com/documentation/api-reference/endpoint/research-get
