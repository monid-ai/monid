# Tasks: add-connector-rheono

## 1. Drill the vendor surface

- [x] 1.1 Published contract: https://rheono.dev/docs/check-api (check) and
      the free-check request the rheono.dev form and MCP server both use
      (request-pentest); response shapes pinned from the vendor's MCP
      `check_app` structuredContent and `check-request` receipt
- [x] 1.2 Verify the free tier: both endpoints public, no key, per-client
      rate limit shared with the vendor's MCP check tool; vendor non-2xx is
      `{ok: false, error}` JSON
- [x] 1.3 Consent posture: the vendor probes read-only, ≤1 rps, refuses
      private/loopback/metadata addresses, honors a public opt-out list

## 2. Provider

- [x] 2.1 `provider.ts`: keyless auth (no-op inject + all-optional
      credential object), `https://rheono.dev` baseUrl, timeouts, provider
      FREE usage model (quantities fns synthesized), consent + rate-limit
      + refusal notes

## 3. Endpoints (2)

- [x] 3.1 `check` — `POST /api/check-app`, `{url}` body, flat mirror
- [x] 3.2 `request-pentest` — `POST /api/check-request`, `{domain, email}`
      body, flat mirror

## 4. Fixtures + tests

- [x] 4.1 Synthetic chains for both endpoints (happy + provider-error) —
      live recording is deliberate (real lead creation) and lands before
      review
- [x] 4.2 Per-endpoint replay tests: compiled urls, FREE settle wiring
      (synthesized fns, shared key), keyless credential compile, body-is-
      the-contract output pinning, provider-error zero-billing
- [x] 4.3 `check` live test runs keyless wherever the network reaches
      rheono.dev; `request-pentest` live test gated on explicit
      RHEONO_LIVE_DOMAIN / RHEONO_LIVE_EMAIL so a CI run never creates a
      stray lead

## 5. Wiring + docs

- [x] 5.1 `security` leaf in `connectors/categories.ts` (same PR)
- [x] 5.2 Verify: fmt · check · test · double-compile byte-identity ·
      catalog smoke
