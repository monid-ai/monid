# Tasks: add-connector-aimlapi

## 1. Connector

- [x] 1.1 `provider.ts`: bearer auth, `https://api.aimlapi.com/v1`,
      US-dollar pool, provider-level `consolidate` (plucks `meta.usage`,
      claims `usd_spent`, omits the entry when absent/null/zero) and
      `fromError` (`message` → `error.message`)
- [x] 1.2 Attribution on `auth.inject`, gated on hostname EQUALITY with
      `api.aimlapi.com` (userinfo and port stripped, lowercased, string
      ops only — `URL` is not a closed-term global); partner id is
      monid's registered one, and an empty literal omits the header
- [x] 1.3 `chat/completions`: OpenAI-compatible mirror, `max_tokens`
      required and `n` defaulted at the binding, credit meter equal to
      the vendor claim, documented ceiling hold
- [x] 1.4 `images/generations`: loose mirror over `{model, prompt}`, the
      same interned credit meter, $1.50-per-image ceiling counted off
      either count spelling
- [x] 1.5 `models`: FREE, family projection merging the two chat types by
      id; `key`: FREE
- [x] 1.6 `text-generation` leaf added to `connectors/categories.ts`
- [x] 1.7 Four ids added to `connectors/ids.lock.json`

## 2. Fixtures & tests

- [x] 2.1 Real fixtures recorded with a vendor key (`deno task record`,
      trimmed) — chat, chat 404, image, roster, key, and a 401 shared by
      the POST endpoints plus its two GET twins; provider-level shared
      chains with `{{request.url}}`. The key chain's `prefix`/`name` are
      hand-scrubbed: `prefix` is the first eight characters of the real
      key
- [x] 2.2 Replay + schema-gate + gated-live tests per endpoint
- [x] 2.3 `provider.test.ts`: the attribution suite — present for the
      gateway on every endpoint; ABSENT for twelve look-alike hosts, for
      a base-url override, and for another connector's wire; the partner
      id pinned to monid's registered one, held to
      `^$|^part_[A-Za-z0-9]{1,64}$`, and proven to be omitted when the
      literal is emptied
- [x] 2.4 The attribution suite was shown to BITE: stripping the headers
      fails 4 of 7, swapping the equality for `endsWith` fails the
      look-alike test on `notapi.aimlapi.com`, and ignoring the
      destination fails 3 of 7 — restored green at 24/24
- [x] 2.5 Live tests pass against the production API (`AIMLAPI_API_KEY`),
      and a live run was observed at egress carrying
      `x-aimlapi-source`, `http-referer` and `x-title` to
      `api.aimlapi.com` and returning a completion
- [x] 2.6 `deno task check && deno task test` pass with no network
      (1277 passed / 0 failed / 219 ignored, against a 1253/0/215
      baseline on unmodified `main`)
