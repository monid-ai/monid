# Add the Scrapeless connector

## Scope

One provider exposes 22 business endpoints across Google Search API (6), AI
Scraper (8), Web Unlocker (1), Amazon Scraper (4) and TikTok Scraper (3).

## Changes

- Give each operation a stable semantic ID, faithful input schema and metadata.
- Support direct results and asynchronous tasks with one submission, original-ID
  polling, bounded retries and retained native responses.
- Declare USD list rates and response-based shopping enhancement counts.
- Provide representative native fixtures for every endpoint, compiled replay,
  input/authentication/error tests and explicitly gated live tests.

No engine, compiler, ABI or category-registry change is required. Source is
self-contained under connectors/scrapeless; generated artifacts and credentials
are excluded. The ID lock adds only the 22 Scrapeless identities.

Validation uses Deno 2, deno task check and deno task test with no network.
Review, merge, catalog publication and production acceptance are tracked as
separate milestones. This preparation has not created a commit or PR.
