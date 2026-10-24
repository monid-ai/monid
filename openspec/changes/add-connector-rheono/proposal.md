# Proposal: add-connector-rheono

## Why

Rheono (rheono.dev) runs continuous, autonomous pentests sold per surface, and
its free front door is a natural agent primitive: an instant, read-only
security-posture check on any live URL, plus the request that hands a domain
to a named researcher for the deeper probe. Agents already ask "is this site
secure / ready to ship / safe to hand over" — today no connector in the
catalog answers it, and `security` is not even a category leaf. Rheono's own
MCP server (rheono.dev/api/mcp) serves the same check to MCP-speaking hosts;
the connector is the plain-REST path for every other agent.

Both endpoints are FREE (the check is the vendor's own free offer, not a plan
tier) and keyless (the endpoint is public by design, rate-limited per client
on the vendor side), so the connector is the tinyfish billing shape with a
new wrinkle: the first connector with NO credentials at all.

## What Changes

- **connectors/rheono** — 2 endpoints against `https://rheono.dev`, no auth,
  provider-level FREE usage model (quantities fns compiler-synthesized).
  - `rheono#check` — `POST /api/check-app`, body `{url}`: TLS state, header
    and cookie findings, checked paths, plain-words summary.
  - `rheono#request-pentest` — `POST /api/check-request`, body
    `{domain, email}`: submission receipt for the researcher-run probe; the
    report is emailed, `started` says whether it is already running.
- **Keyless auth, declared not omitted.** `auth.inject` must resolve
  (compile-time), so the provider declares a no-op inject
  (`({ data }) => data.request`) and an empty strict credential object —
  the injector validates zero fields and the request egresses bare. The
  default `{apiKey}` shape would wrongly demand `RHEONO_CREDENTIALS_API_KEY`.
- **One new category leaf**: `security` in `connectors/categories.ts`, same
  PR per the closed-vocabulary rule.

## Capabilities

- `rheono-connector`.

## Non-goals

- No `verify_ownership` / `check_status` endpoints yet: ownership is a
  flow (issue a TXT record, publish, re-check), not a single call; they can
  follow as their own change if agent demand shows up.
- No metered deep-run endpoint. The vendor's paid surface is sold per
  surface, not per call; if a per-call run-status API emerges, that is a
  MODEL change on a new endpoint.
- Fixtures are real recordings against the deployed endpoint
  (rheono.dev, 2026-10-24). `request-pentest` was recorded against
  example.com (IANA-reserved, harmless to probe) with the vendor's own
  support address as the report recipient — one real lead row, deliberate.

## Impact

New connector tree only. No engine, compiler, preset, or Unit change; no
`ENGINE_VERSION` movement. One category leaf added.
