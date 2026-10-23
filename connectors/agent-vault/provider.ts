import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * Agent Vault (agentvault.io) - a login and payment layer for agents. This
 * connector exposes the HTTP API: the mock token catalog, the Checkout
 * Recipe Registry, and agent signup / login requests. Eight synchronous
 * REST endpoints against `https://api.agentvault.io`, auth
 * `Authorization: Bearer <apiKey>` (the dashboard API key).
 *
 * Billing: the HTTP API publishes no per-call price. Agent Vault sells
 * monthly plans (Free, Plus, Enterprise) that cap agent cards and payments,
 * and the plan only changes the API rate limit; none of these eight
 * endpoints moves money. Every endpoint is therefore FREE here.
 * PLACEHOLDER: confirm with Agent Vault that no per-call charge is
 * intended before relying on this.
 *
 * Browser control (filling a checkout or sign-in form) runs through the
 * Agent Vault MCP server or Playwright SDK over a WebSocket, not this API,
 * and is not part of this connector.
 */
export default defineProvider({
    name: "agent-vault",
    meta: {
        displayName: "Agent Vault",
        summary:
            "A portable login and payment layer that lets your AI agents act " +
            "on your behalf without ever seeing your passwords or card " +
            "details.",
        description:
            "A portable login and payment layer that lets your AI agents act " +
            "on your behalf without ever seeing your passwords or card " +
            "details.",
        homepageUrl: "https://agentvault.io",
        docsUrl: "https://docs.agentvault.io/reference/http-api",
        categories: ["agent-identity"],
        notes: [
            "Errors are JSON with a stable `code` and a readable `error`; " +
            "branch on `code`, not `error`.",
            "An API key is bound to one Agent Vault account. Tokens, " +
            "logins and signup requests all belong to that account.",
            "Rate limits are per key and per account in one-minute " +
            "windows and depend on the account plan; a 429 carries " +
            "`Retry-After` in whole seconds.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.agentvault.io" },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        /** PLACEHOLDER: no per-call price is published (see header). */
        model: { kind: UsageModelKind.FREE },
    },
});
