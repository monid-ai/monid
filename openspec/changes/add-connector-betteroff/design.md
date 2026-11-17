# BetterOff connector decisions

The connector uses the existing contract and engine. These decisions explain its differences from a direct REST connector.

## D1: Keep household credentials outside tool input

BetterOff authorizes each household through OAuth. The provider declares a nonempty `accessToken` credential and a bearer injector that reads that field. The existing bearer preset reads `apiKey`; retaining `accessToken` makes the short-lived OAuth credential explicit. Local callers use `BETTEROFF_CREDENTIALS_ACCESS_TOKEN`.

Each endpoint accepts only its tool's input fields. The request fixes the destination and tool name. Inputs cannot select another household, supply a credential, or invoke a different tool. BetterOff derives household identity and scopes from the token and grant.

Token acquisition and refresh belong to the caller or host. Access tokens expire after 600 seconds. The connector never receives a refresh token. Monid must establish the authenticated caller-to-credential binding before hosted publication; a shared household token is not an acceptable substitute. The public relay stub and owned-resource interface do not prove that binding exists.

## D2: Wrap fixed MCP calls and request JSON responses

All 29 tools share `POST https://api.betteroff.finance/mcp`, so each endpoint declares its own identity separately from the transport path. Its `input.toRequest` wraps validated input in JSON-RPC `tools/call` with a fixed tool name and request ID `1`.

The provider sends `MCP-Protocol-Version: 2025-03-26` and accepts both JSON and event streams as required by the MCP HTTP transport. BetterOff's legacy transport path returns a completed JSON response. The connector has no session state, initialization exchange, or SSE parser. Unexpected event-stream text is a provider error, not a successful financial result. A change to BetterOff's protocol support requires a new live compatibility check.

## D3: Classify MCP failures before output mapping

A provider-level `lifecycle.start` runs the same single request for every endpoint. HTTP failures pass through. JSON-RPC errors, MCP `isError`, structured `ok: false`, and invalid JSON-RPC wrappers become HTTP 502 provider errors with `providerHttpStatus: 200` when the upstream response was HTTP 200. The original envelope remains available, and the engine settles zero usage.

Successful wrappers pass through the shared `output.fromResponse` mapping. Each endpoint then validates its own result schema. A missing or malformed required success field throws the engine's `CONTRACT_VIOLATION`; it is not reclassified as a provider error. Keeping this distinction avoids duplicating the engine's schema validator inside a lifecycle hook.

## D4: Validate known financial fields and preserve extensions

The schemas mirror BetterOff's version 4 tool result contracts, reviewed against the published API on October 25, 2026. The provider shares output mapping; each endpoint declares its result schema by extending the common envelope. Success data follows the tool-specific object or array shape. Feedback returns a receipt without the financial result envelope. New financial tools require `revision` and the deprecated `householdRevision`; the original three also accept earlier v4 results without `revision`.

Objects allow additional properties throughout the result. Validation does not strip new provider fields. New money schemas require decimal text; the original three retain compatibility with legacy numeric amounts. The connector performs no coercion, rounding, or arithmetic. Nullable amounts, ratios, and projections remain nullable. Complete, partial, and unavailable quality states are all accepted with their evidence and warnings.

Cash-flow input keeps both nullable ISO date fields required, matching BetterOff. Null dates request the household's current month and today. Date ordering and the 366-day maximum remain BetterOff checks; their tool errors pass through with zero usage. Cross-field refinements are not added to compiled input schemas.

## D5: Separate connector validation from hosted release

All BetterOff calls use the FREE model for zero per-call provider usage. Every tool requires BetterOff Core and its declared OAuth scopes. Paid, complimentary, and payment-grace Core access qualify; Free and trials do not. FREE does not establish plan eligibility or a hosted offer price. Runtime notes contain credential and use constraints; preparation status and hosted questions belong in the contribution records.

Tests run compiled sealed units. Endpoint tests cover realistic results, provider errors, invalid inputs with passing twins, and endpoint-specific output failures. Provider tests cover inherited hooks, the outgoing request, credentials, error mapping, and metadata preservation. Live tests use `liveSkip("betteroff", ["accessToken"])`, assert shape rather than household amounts, and do not print financial records.

The September 28 [GrowSurf decision](https://github.com/monid-ai/monid/pull/57#issuecomment-5875186568) declined BYOK, while the later [Ad Legends review](https://github.com/monid-ai/monid/pull/65#issuecomment-5879666577) required per-caller credentials or resources for private account data. These establish questions for maintainers, not proof that BetterOff can run through the hosted relay. Hosted acceptance requires verified credential ownership, refresh, revocation, scope enforcement, result handling, and pricing.

## D6: Bind OAuth connections to individual callers in the host

The host must select a private connection for the authenticated Monid principal, including when multiple principals share a workspace. The public engine accepts an asynchronous credential resolver bound to that principal; it does not independently verify principal ownership. `scopeKey` alone does not scope credentials. No shared provider token may be a fallback for a missing, foreign, or disconnected connection.

`oauth-isolation.test.ts` runs the compiled endpoints with distinct synthetic caller-bound resolvers and concurrent requests. It checks rejected model identity fields before credential lookup, host denial before egress, token re-resolution, and disconnect after an endpoint is loaded. It does not implement host ownership storage, JWT verification, a callback, OAuth refresh, or refresh locking. Those need host integration tests. A separate research negative control demonstrates that a shared resolver returns the same household to both callers; the connector cannot detect that host mistake.

Monid must run authorization code with S256 PKCE for the generic resource `https://api.betteroff.finance/mcp`, request only the scopes needed for user-enabled tools and `offline_access`, and verify client registration permits that resource. The inspected BetterOff registration configuration defaults to the ChatGPT-specific resource, so the generic flow must be tested explicitly. Token exchange and refresh must preserve the resource and authorized subject/grant. The configured refresh token rotates with no reuse window; the host must serialize refresh and atomically replace credentials. Disconnect must prevent an in-flight refresh from restoring access.

Saperly's resource reader is scoped by the host to a workspace. Copying its resource declaration would not establish BetterOff's private caller-to-token binding. No dummy resource or model-supplied connection selector is added.

## D7: Preserve authorization and entitlement denials

Transport denials remain HTTP 401/403, temporary authorization failures remain HTTP 503, and their structured codes pass through unchanged. The connector makes one provider request and does not refresh, retry, discard credentials, or escalate scopes. The host owns those decisions. The final engine result does not expose `WWW-Authenticate`; the host must inspect transport challenges before they are lost.

Current plan denial is HTTP 403 with `AGENT_SUBSCRIPTION_INACTIVE` for all tools. It remains 403 with its original body and zero usage. Earlier tool-level plan denial inside HTTP 200 remains covered: D3 maps it to 502 with the original 200 preserved and recovery instructions intact. It must not become a successful empty or unavailable recurring result. Synthetic denial tests exercise propagation, not BetterOff's authorization decision or a live subscription check.

## D8: Preserve preparation and execution boundaries

Three correction tools save proposals. Three request tools save financial action requests. Their results include review links and status; the connector does not follow links, approve, apply, sign, or execute. `cancel_action_request` changes a pending request immediately when provider policy allows it. `submit_feedback` creates a support case after the user approves the diagnostic summary. Neither is a preview.

Transfer and vault input schemas require the outside-agent idempotency key described by BetterOff. Bank input is a union of empty discovery input and complete creation input, including that key. The public schema also serves in-app callers and marks these keys optional; the Monid adapter deliberately requires them for outside-agent writes. No automatic retries or generated replacement keys are added. Forwarding an unchanged key does not prove provider deduplication.

Feedback requires `userApproved: true` and a UUID retry key. The host must obtain actual consent and avoid sensitive financial data or conversation history in diagnostic text. Schema validation cannot establish human consent. Transfer scopes use the generic MCP resource and are unavailable on the ChatGPT resource.

The engine's endpoint metadata has no MCP readOnlyHint or approval-gate field. Descriptions and notes identify writes; this contribution does not invent unsupported annotations or claim a hosted confirmation mechanism. The public engine can carry preparation calls, but hosted review-link presentation, consent, private saved results, and caller authorization still require verification.
