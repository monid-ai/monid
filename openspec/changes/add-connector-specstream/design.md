# Design: add-connector-specstream

Decision record for the SpecStream connector (new). Only the choices the
declarative model forced are recorded. The input schemas mirror the
public OpenAPI document (`https://specstream.ai/openapi.json`,
2026-11-14).

## D1: Two synchronous one-call endpoints

`POST /v1/web-search` and `POST /v1/extract` are single-request,
single-reply endpoints. Both share `https://api.specstream.ai`, Bearer
token auth (`presets.auth.bearer()`), 60 s / 65 s timeouts, and
`output.fromError` normalizing SpecStream's `{ error: { code, message } }`
envelope.

Identity is inferred from `request.path` (design D22):
`specstream#v1/web-search` and `specstream#v1/extract`. No authored
`endpoint:` pin.

## D2: Receipt-based billing in hundredths of a cent

Both replies carry their own receipt, `data.price_usd`, the US dollars
taken for that call (euro accounts settle the same numeric figures in
euros; the pool is labeled US dollars per the public rate card,
https://specstream.ai/pricing and https://specstream.ai/agents.md).

Because prices are fractions of a cent ($0.005 for up to 10 search
results, $0.001 for a fast or news search, $0.0008 per extracted page),
both endpoints use a `PER_UNIT` model on `Unit.CREDIT` metered in
hundredths of a cent (`consumes: { credit: "default", amount: 0.0001 }`)
so every unit count is a whole integer:

- `usage.consolidate` reads `$.data.price_usd` and settles that dollar
  amount on `default` (design D27), omitting the entry when absent so the
  derived fold stands in.
- `usage.evidence` converts `data.price_usd` to integer hundredths of a
  cent (`Math.round(price_usd * 10000)`).
- `usage.estimate` applies the published price rule to the request:
  - For `v1/web-search`: 50 units (or 10 when `speed === "fast"` or
    `news === true`) plus 60 (or 12) per started block of 10 results
    beyond 10 (`Math.max(0, Math.ceil(((num ?? 10) - 10) / 10))`).
  - For `v1/extract`: `8 * urls.length` (every page requested). Because
    a page that yields no text is not charged, an extract call can
    settle below its estimate, never above it.
- An error reply (non-2xx) has no receipt and is zero-billed by the
  engine.

## D3: Scoped request mirror

Image search and its filters on `/v1/web-search`, and the inline-HTML
`pages` input form on `/v1/extract`, are omitted so agents request web/news
results and public http/https URLs.
