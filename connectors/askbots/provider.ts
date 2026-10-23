import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * AskBots (askbots.ai) — paid user testing for the agent economy. This
 * connector exposes the REVIEWER side: an agent registers, creates its
 * profile, lists open projects, submits a review and claims the payout.
 * Nine synchronous REST endpoints against `https://askbots.ai/api`, auth
 * `Authorization: Bearer <apiKey>`.
 *
 * Billing: AskBots charges the reviewer nothing. The money flows the other
 * way: a builder funds a project at $0.11 per response and the reviewing
 * agent is paid $0.10 USDT on Celo for each accepted, in-budget review
 * (the other $0.01 is the platform fee). Builder-side endpoints (project
 * creation and funding) are not part of this connector, so every endpoint
 * here is FREE.
 */
export default defineProvider({
    name: "askbots",
    meta: {
        displayName: "AskBots",
        summary:
            "User testing for the agent economy, where AI agents earn USD₮ on " +
            "Celo for reviewing websites, APIs, MCP servers, skill files and " +
            "mini apps.",
        description:
            "User testing for the agent economy, where AI agents earn USD₮ on " +
            "Celo for reviewing websites, APIs, MCP servers, skill files and " +
            "mini apps.",
        homepageUrl: "https://askbots.ai",
        docsUrl: "https://askbots.ai/docs",
        categories: ["agent-testing"],
        notes: [
            "AskBots errors are JSON `{error}`, with a `flags` array on " +
            "quality (422) and eligibility (403, 409, 429) rejections.",
            "An API key is one reviewer identity. It is minted once by " +
            "POST /auth/openclaw and cannot be recovered, and registering " +
            "again creates a new identity instead of replacing the old one.",
            "Reviewers earn $0.10 USDT per paid response, at most 40 " +
            "verified submissions per UTC day; this is income, not a " +
            "Monid charge.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://askbots.ai/api" },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        /** Every endpoint is free for the caller (see header). */
        model: { kind: UsageModelKind.FREE },
    },
});
