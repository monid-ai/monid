# Tasks: add-connector-zernio

## 1. Provider + category

- [x] 1.1 provider.ts: bearer auth, `https://zernio.com` base with
      `/api/v1` on every path, one pool (`default` = US dollars), `userId`
      strip on fromResponse and fromError
- [x] 1.2 categories.ts: `social-publishing`

## 2. Resource

- [x] 2.1 `zernio/profile`: free monthly card; verify (404 = inactive);
      release (disconnect accounts, then delete the profile)

## 3. Endpoints (9)

- [x] 3.1 `/create-profile` (PROVISIONS), `/list-profiles` (READS, window
      only), `/release-profile` (RELEASES)
- [x] 3.2 `/connect-account` (handoff link), `/connect-status` (handoff
      poll, foreign-account refusal), `/list-accounts` (profile-filtered)
- [x] 3.3 `/create-post` (account ownership check before POST, platform
      derived, tenancy tag, PER_CALL $0.01), `/get-post` (tag check), one
      shared post projection
- [x] 3.4 `/upload-media` (declarative presign relay)

## 4. Tests

- [x] 4.1 18 replay tests over synthetic chains: seeds, window reads,
      foreign profile / account / handoff / post refusals, publish-now,
      partial publish, release and verify ops
- [x] 4.2 Live gate (`ZERNIO_API_KEY`): upload-media
- [x] 4.3 Full flow run live through `deno task engine:run` against
      production; probes deleted
- [x] 4.4 ids.lock.json: the 9 endpoint ids and `zernio/profile`
