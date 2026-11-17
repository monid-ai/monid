# Tasks: add-connector-mindcase

## 1. Drill the vendor surface

- [x] 1.1 Pin base url, bearer auth, the run / job / results / cancel routes
      and the status set (`queued`, `running`, `completed`, `failed`,
      `cancelled`, `rejected_balance`)
- [x] 1.2 Pull every agent's published schema (`?expand=options`), price,
      page fee and add-ons
- [x] 1.3 Check the fee shapes against settled production jobs: company
      employees $0.05 flat per run, people search $0.05 per search page (25
      profiles, Maps photos $0.00025 per row

## 2. Provider

- [x] 2.1 `provider.ts`: auth, `{params}` toRequest, lifecycle, fromError,
      USD pool, `usd_used` consolidate, row-count evidence default

## 3. Endpoints (242)

- [x] 3.1 Generate `schema/inputs.ts` and `endpoint.ts` per agent
- [x] 3.2 Split `linkedin/profiles` into by-URL and search
- [x] 3.3 Composite models for page fees and photo add-ons; FREE for the YC
      founders dataset
- [x] 3.4 Category leaves for quick commerce, e-commerce, ads, web traffic,
      local business, social media and real estate
- [x] 3.5 Sibling pointers on overlapping endpoints

## 4. Fixtures + tests

- [x] 4.1 Record one live chain (zepto/products), minimize into
      `fixtures/job-succeeded.json`
- [x] 4.2 Synthetic chains for empty, wallet-exhausted, failed, cancelled,
      rejected-balance, start-rejected and unknown-status
- [x] 4.3 `lifecycle.test.ts`: every endpoint replays the happy chain;
      failure paths; params wrapping; schema gate; estimates; gated live test
- [x] 4.4 `deno task check && deno task test` green; `ids:check` updated
