# Tasks: add-apify-johnvc-actors

## 1. Select and drill the actors

- [x] 1.1 Pull the johnvc Store listing (`/v2/store?username=johnvc`,
      2026-09-22): usage, reviews, `currentPricingInfo`; confirm every actor
      is `PAY_PER_EVENT`
- [x] 1.2 Apply the rating-and-usage cutoff and remove overlaps with
      Monid's catalog → 18
- [x] 1.3 Read each actor's source for its charge sites, row shape, error
      marker, cap semantics (zero = unlimited / raised floor / hard cap)

## 2. Schemas

- [x] 2.1 Scaffold `schema/inputs.ts` + `schema/output.ts` from the public
      build endpoint for all 18 (token-free); unquote identifier keys
- [x] 2.2 Curate the three `z.any()` fields the scaffold cannot type
      (`youtube_url`/`channel` string|array, `image_base64` string list,
      `startUrls` request list)

## 3. Endpoints (18)

- [x] 3.1 Page-based: google-jobs-scraper, google-flights, scrape-yandex,
      baidu-search-scraper, google-scholar-api, google-events-api
- [x] 3.2 Per-result: youtube-transcripts, google-images-api,
      apple-app-store-reviews-api, workday-careers-api,
      us-congress-financial-disclosures, yandex-reverse-image-search
- [x] 3.3 Leaf: fuelprices
- [x] 3.4 Input-gated: google-lens-api, google-hotels-search-scraper,
      google-local-services-api, naver-search-api
- [x] 3.5 Per-query: google-maps-directions-api

## 4. Drift suite

- [x] 4.1 D1: `FLAT_EVENT` learns `setup`/`startup` (+ tests)
- [x] 4.2 D2: summed rate join over every event normalizing onto an id
      (+ tests)
- [x] 4.3 Offline pricing check of all 18 pins against the public
      `pricingInfo` (token policy: no key reaches the drift task locally)

## 5. Wiring + tests

- [x] 5.1 `connectors/categories.ts`: image-search, academic-search, events,
      government-data
- [x] 5.2 `test-inputs.json` rows (public inputs only); `CHAIN_COUNTS` rows
      for the multi-metered docs; `ids.lock.json` (+18, nothing else)
- [x] 5.3 Estimate spot checks per archetype and per gated line in
      `lifecycle.test.ts`
- [x] 5.4 Verify: fmt · lint · check · test · double-compile byte-identity ·
      version:check · catalog smoke · estimate spot-checks against the
      published cards

## 6. Follow-ups

- [ ] 6.1 Tranche 2 (rated 10–29 u30, earnings-call transcripts, and the
      held-back Tier-A actors)
- [ ] 6.2 Gap-fill tranche (ATS family and other actors with no Monid
      equivalent)
