import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * Edge (getedge.cc) — the skill router for agents. Edge searches about
 * 130,000 public agent skills (SKILL.md packages from public GitHub
 * repositories), ranks them for the exact task an agent is about to do,
 * and loads the chosen skill's instructions for that task. Two synchronous
 * JSON endpoints on `https://getedge.cc/api/v1` (OpenAPI 3.1 at
 * `/api/v1/openapi.json`), `Authorization: Bearer <key>`.
 *
 * The surface is Edge's plain JSON API for tool gateways — the same search,
 * ranking, security gate and loader as Edge's MCP server (`/mcp`), without
 * the JSON-RPC/SSE envelope. The MCP-only tools (`rate_skill`, account
 * tools) are not on this surface and are not exposed.
 *
 * Billing: both endpoints are FREE (OpenAPI `x-price`: PER_CALL $0) — the
 * model ALONE suffices (tinyfish posture): no vendor meter to consolidate,
 * compiler-synthesized quantities.
 *
 * Auth: Edge keys start with `edge_`. A key is optional upstream (a call
 * without one runs anonymously, and a wrong key also runs anonymously
 * rather than failing); the provider still declares the standard
 * `{apiKey}` credential so a hosted operator's key attributes its traffic.
 */
export default defineProvider({
    name: "edge",
    meta: {
        displayName: "Edge",
        summary: "Find and load the best expert skill for an agent's task " +
            "— free.",
        description: "Skill search and loading for agents. Describe the " +
            'task in plain words ("write a cold email sequence", "add an ' +
            'index to a postgres table without locking it", "set up ' +
            'Playwright end-to-end tests") and Edge searches about 130,000 ' +
            "public agent skills — SKILL.md expert workflows, playbooks, " +
            "and how-to instructions published on GitHub — ranks them for " +
            "that exact task, and returns only skills whose exact bundle " +
            "passed Edge's automated security checks. Then load the " +
            "recommended skill's full instructions and follow them for the " +
            "task. Use it before specialist work: how to do X, best " +
            "practice for Y, an expert workflow for Z. Free.",
        homepageUrl: "https://getedge.cc",
        docsUrl: "https://getedge.cc/api/v1/openapi.json",
        categories: ["agent-skills"],
        notes: [
            "Free: every call is $0.",
            "Two steps: `find_skill` returns `request_id` plus each " +
            "skill's `source` and `skill`; pass all three to `use_skill` " +
            "to load the instructions.",
            "Only skills whose exact bundle passed Edge's automated " +
            "security checks are returned or loaded. This is a screening " +
            "result, not a safety guarantee.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://getedge.cc/api/v1" },
    // find_skill ranks in 3-15 s (OpenAPI); use_skill returns tens of KB.
    timeouts: { requestMs: 60_000, runMs: 60_000 },
    usage: {
        // FREE (designs D25/D27): Edge bills nothing on either endpoint.
        model: { kind: UsageModelKind.FREE },
    },
});
