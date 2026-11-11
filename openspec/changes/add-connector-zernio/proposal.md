# Proposal: add-connector-zernio

## Why

Every social leaf in the catalog (`instagram`, `tiktok`, `linkedin`,
`twitter`, `facebook`, `reddit`, ...) READS public data. No connector lets an
agent POST: publish or schedule content from accounts its user owns. Zernio
(zernio.com) is a social media API for exactly that: one call publishes text,
images, video or carousels to X, Instagram, Facebook, LinkedIn, TikTok,
YouTube, Threads, Pinterest, Bluesky, Google Business, Telegram and Reddit.
Authored by the Zernio team against its public OpenAPI spec.

## What Changes

- **connectors/zernio**: 9 endpoints + 1 resource on
  `https://zernio.com/api/v1`, Bearer auth, one pool `default` (US dollars).
  - **The profile is the owned resource** (`zernio/profile`, free, $0 monthly
    clock). The key is ONE pooled Monid account, so every account- and
    post-scoped endpoint USES a profile and a foreign profile id is the
    pre-gate 404. This is the second resource-backed connector after saperly.
  - **A profile gate alone is not enough.** Accounts and posts carry their
    own ids, so `/create-post` reads the gated profile's accounts and refuses
    any target outside it BEFORE `POST /posts`; `/get-post` checks the
    `metadata.monidProfileId` tag `/create-post` writes; `/connect-status`
    refuses a handoff whose accounts sit on another profile.
  - **The human step is explicit.** Connecting a social account needs its
    owner: `/connect-account` returns Zernio's 30-minute handoff link (QR or
    plain link, no Zernio signup for the owner) and `/connect-status` polls
    it. Descriptions say so, so `discover` never offers it as agent-only.
  - **Billing:** `/create-post` is flat PER_CALL ($0.01 per post, however
    many accounts it targets; a 207 partial publish still bills). Every other
    endpoint is FREE.
  - **No pooled data leaks:** `/list-profiles` is served from the ownership
    window, account lists are filtered upstream by `profileId`, the pooled
    account's `userId` is stripped on success and error surfaces, and posts
    pass through one allowlist projection.
  - **Release** disconnects the profile's accounts, then deletes it (Zernio
    refuses to delete a profile with active accounts).
- **connectors/categories.ts**: new leaf `social-publishing`, the first WRITE
  leaf for social networks.
- **connectors/ids.lock.json**: the 9 endpoint ids and the resource id.
  (Unrelated drift already on `main` for bytedance, fundable and hunterio is
  left untouched.)

## Impact

- No engine, schema or doc-format change; no version bump.
- Fixtures are SYNTHETIC, shaped on the public spec. The full flow was also
  run live through `deno task engine:run` against production (create
  profile, handoff link, foreign profile and foreign account refusals, a
  scheduled post read back and refused from another profile, upload url),
  and every probe was deleted afterwards.
