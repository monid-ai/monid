# Proposal: add-connector-apiindonesia

## Why

[API Indonesia](https://apiindonesia.id) turns Indonesian government and
reference datasets into one JSON API: the Kemendagri region tree, postal
codes, national holidays, prayer times, the school, university and hospital
directories, BMKG earthquakes and weather, Bank Indonesia rates, DJKI
trademarks, the BPJPH halal and BPOM product registries, the KBBI
dictionary, provincial minimum wage, the OJK illegal-investment list, LEI
records and the Indonesian Hijri calendar. None of this is in the catalog
today, and an agent working on anything Indonesian (addresses, business
days, compliance checks, brand checks) currently has to scrape a dozen
government portals. Submitted by the vendor (Khaisa Studio).

Priced in the vendor's own credits: 1 credit = IDR 1, and every generic data
endpoint costs 2 credits per successful request. Non-2xx answers are
refunded by the vendor (`src/lib/pricing.ts`, "a failed hit is never priced
and never charged").

## What Changes

- **connectors/apiindonesia**: provider (`presets.auth.header("x-api-key")`
  on `https://use.apiindonesia.id/api/v1`) + 19 synchronous GET endpoints:
  `wilayah/search`, `kodepos/search`, `libur`, `sholat`, `sekolah`,
  `kampus`, `rumah-sakit/search`, `gempa/terkini`, `cuaca/search`, `cuaca`,
  `kurs-bi/latest`, `merek/search`, `halal`, `bpom`, `kbbi/word/{word}`,
  `ump`, `ojk/illegals`, `lei`, `hijriah/konversi`.
- **Billing**: one `default` pool ("API Indonesia credits (1 credit =
  IDR 1)"), leaf `PER_CALL` at 2 credits declared once on the provider and
  inherited by every endpoint. No `consolidate`: responses carry no usage
  receipt, so the derived fold is the bill.
- **Errors**: provider-level `output.fromError` lifts `error.message` and
  `error.code` from the vendor's `{success:false, error:{code, message}}`
  envelope, so an agent can branch on `NOT_FOUND` / `VALIDATION_ERROR` /
  `INVALID_API_KEY`.
- **Inputs**: strict query/path mirrors of the vendor's published OpenAPI
  (https://apiindonesia.id/openapi.json); a misspelled filter is
  `INVALID_INPUT` before any call.
- **Fixtures**: one recorded happy chain per endpoint (production,
  2026-11-02), plus recorded 404s for `kbbi/word/{word}` and `sholat` and a
  recorded 401. Natural-person names in the halal and trademark fixtures are
  replaced with placeholder personas.

## Capabilities

- `apiindonesia-connector`.

## Non-goals

- Detail-by-id routes (`/sekolah/{npsn}`, `/kampus/{id}`, `/bpom/{nie}`, ...)
  and the full region tree walk (`/wilayah/provinsi/...`): the search and
  list endpoints already return the same rows; they can follow if agents ask.
- Paid-only and non-data products (image upscale, AI gateway, email
  verification), the account/billing routes, and the utility generators
  (dummy NIK/NPWP).
- GeoJSON boundaries (large payloads, better as a file download).

## Impact

New connector tree, 19 new ids in `connectors/ids.lock.json` (only these;
the lock's existing drift in other providers is left as it is) and this
change. No `categories.ts` change (`government-data`, `maps`, `events`,
`legal-research`, `company-enrichment`, `news-search` exist), no new Unit,
preset or hook, no engine or schema version bump.
