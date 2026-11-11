# zernio-connector (delta)

## ADDED Requirements

### Requirement: Zernio provider with one pool and a pooled-tenancy strip
The zernio provider SHALL declare name `zernio`, `request.baseUrl`
`https://zernio.com` (every path carries `/api/v1`), auth
`presets.auth.bearer()`, timeouts 30 s request / 60 s run, the single credit
pool `default` ("US dollars"), and provider-level `output.fromResponse` /
`output.fromError` that remove `userId` from every surface.

#### Scenario: An upstream error never leaks the pooled account id
- **WHEN** `POST /profiles` answers 402 with a body carrying `userId`
- **THEN** the run SHALL complete as a provider error with zero usage and
  no `userId` anywhere in the output

### Requirement: The profile is the owned resource
The connector SHALL declare `zernio/profile` with a free monthly rate card.
`/create-profile` SHALL provision it (seeded under the caller's name; the
upstream name carries the run id because profile names are unique across the
pooled account), `/list-profiles` SHALL be served from the ownership window
only, and `/release-profile` SHALL mark the release. The resource's
`release` SHALL disconnect every account of the profile, then delete it;
`verify` SHALL report a 404 as inactive.

#### Scenario: A foreign profile is refused before any upstream call
- **WHEN** `/connect-account` or `/create-post` names a profile the
  workspace does not own
- **THEN** the run SHALL answer the uniform 404 with zero usage and no
  upstream request

### Requirement: Accounts and posts are checked against the gated profile
`/create-post` SHALL read `GET /accounts?profileId=<gated>` and SHALL refuse
(404, zero usage) any target accountId outside it before `POST /posts`; it
SHALL derive each target's `platform` from that list and tag the post with
`metadata.monidProfileId`. `/get-post` SHALL answer 404 when that tag differs
from the gated profile. `/connect-status` SHALL answer 404 when any account of
the handoff sits on another profile.

#### Scenario: Publishing through another tenant's account
- **WHEN** `/create-post` targets an accountId not connected to the gated
  profile
- **THEN** the run SHALL answer 404 with zero usage and SHALL NOT call
  `POST /posts`

### Requirement: One flat charge per post
`/create-post` SHALL bill PER_CALL $0.01 on any 2xx, including a 207
partial publish; without `scheduledFor` it SHALL publish immediately. Every
other endpoint SHALL be FREE.

#### Scenario: Publish now to two networks
- **WHEN** `/create-post` targets an X and a LinkedIn account with no
  `scheduledFor`
- **THEN** usage SHALL be `{credits: {default: 0.01}, evidence: {CALL: 1}}`
  and the output SHALL carry each network's status and `platformPostUrl`
