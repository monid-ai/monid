import { defineProvider, UsageModelKind } from "@shared/core";

/**
 * ZenSched (zensched.com) — agent-first field workforce scheduling over MCP.
 *
 * Phase 1 (this PR): unauthenticated funnel endpoints only — onboarding
 * guide, email-less org creation (returns a per-agent zsc_ key), and
 * product feedback. Agents discover ZenSched on Monid, cold-start an org,
 * then connect directly to https://mcp.zensched.com/mcp with Bearer auth.
 *
 * Phase 2 (follow-up PR, pending Monid review): org-scoped scheduling tools
 * behind partner-key + caller-supplied zsc_ in the JSON-RPC body.
 */
export default defineProvider({
    name: "zensched",
    meta: {
        displayName: "ZenSched",
        summary:
            "Field workforce scheduling with GPS-verified check-in for agents.",
        description: "Agent-first field workforce scheduling — locations, " +
            "worker invites, shifts, GPS-verified check-in, mobile forms, " +
            "webhooks, and timesheets. No vendor dashboard; operators run " +
            "crews through MCP. Cold-start with account_create to mint a " +
            "zsc_ org key, then connect to https://mcp.zensched.com/mcp. " +
            "Paid meters (worker invite, geocode, GPS verify, forms, " +
            "processed timesheets) require prepaid balance on zensched.com.",
        homepageUrl: "https://www.zensched.com",
        docsUrl: "https://www.zensched.com/docs/quickstart/",
        categories: ["field-workforce"],
    },
    auth: {
        /** Public funnel tools — no vendor credential on the wire. */
        inject: ({ data }) => data.request,
    },
    request: {
        baseUrl: "https://mcp.zensched.com",
        headers: { "Content-Type": "application/json" },
    },
    timeouts: { requestMs: 30_000, runMs: 35_000 },
    usage: {
        model: { kind: UsageModelKind.FREE },
    },
    output: {
        /** MCP Streamable HTTP: unwrap tools/call text JSON from the envelope. */
        fromResponse: ({ data, utils }) => {
            const text = utils.json.optionalGet(
                data.output,
                "$.result.content[0].text",
            );
            if (typeof text !== "string") return data.output;
            try {
                return JSON.parse(text);
            } catch {
                return { raw: text };
            }
        },
    },
});
