import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * Vela Breakout (breakout.vela.partners) — what is growing in tech,
 * measured daily. Every endpoint is ONE synchronous JSON GET against
 * `https://breakout.vela.partners/api/v1` (the `/api/v1` prefix survives
 * url resolution, the fundable posture), auth `Authorization: Bearer
 * <key>`.
 *
 * Billing: Breakout prices a ranked list at $0.02 and a company lookup
 * at $0.01, taken from the account's prepaid dollar credit; `/groups`
 * is free, and only an
 * HTTP 200 is charged (400/401/402/404/429/503 cost nothing — a 404 for
 * an unknown company is explicitly not charged). The vendor publishes
 * its price in DOLLARS and meters one dollar balance, so the pool IS
 * dollars (the exa/minimax/dataforseo posture, design D26), and the
 * provider states the PER_CALL 0.02 the three list endpoints inherit;
 * `/company` overrides it with PER_CALL 0.01 and `/groups` with FREE. Responses carry
 * NO cost or credit field, so there is no `usage.consolidate` (design
 * D27, the tinyfish/clay/keenable posture): the derived fold settles.
 *
 * Out of scope: `POST /ask` — its price is the language model's cost
 * plus margin and varies per question, and Breakout reports no meter a
 * consolidate could read, so a flat card would be wrong in both
 * directions.
 */
export default defineProvider({
    name: "vela-breakout",
    meta: {
        displayName: "Vela Breakout",
        summary: "What is growing in tech, measured daily: AI apps and " +
            "models, agent tools, extensions, packages, software " +
            "adoption, hiring, news and research ideas.",
        description: "Vela Breakout by Vela Partners — what is growing in " +
            "tech, measured daily: AI apps and models, open models, agent " +
            "tools and skills, editor/browser extensions and workplace " +
            "add-ons, developer packages, business software adoption, web " +
            "technologies, hiring, news and AI research ideas. Every " +
            "figure is measured (tokens, downloads, installs, " +
            "spend-panel adoption, open roles), never estimated, and " +
            "returned in words with unit, window, caveat, peer percentile " +
            "and a link to its chart. Start with /groups to see what can " +
            "be ranked, rank one group with /breakouts, look up one " +
            "company with /company, find companies rising on several " +
            "measures at once with /rising-companies, and follow AI " +
            "research momentum with /ideas. Not a firmographics, funding " +
            "or contact database: it answers 'what is growing, how fast, " +
            "against which peers'.",
        homepageUrl: "https://breakout.vela.partners",
        docsUrl: "https://breakout.vela.partners/agent",
        categories: ["market-trends", "company-enrichment"],
        notes: [
            "A ranked list (/breakouts, /rising-companies, /ideas) costs " +
            "$0.02 a call, a company lookup (/company) $0.01; /groups is " +
            "free. Only " +
            "HTTP 200 is charged — bad input (400), a missing key (401), " +
            "out of credit (402), an unknown company (404), the rate " +
            "limit (429) and failures (503) all cost nothing.",
            "Rate limit: 120 calls a minute per key; past it the API " +
            "answers 429.",
            "Figures refresh daily; `measured_as_of` on each answer is " +
            "the date the numbers were measured.",
            "Growth is a ratio of now over before (`growth_value`, e.g. " +
            "1.15 = +15%), with `growth`, `before` and `now` also given " +
            "as words with their unit. For rank-based measures a ratio " +
            "above 1 means climbing closer to the top.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://breakout.vela.partners/api/v1" },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        /** THE credit system (design D26): Breakout meters one prepaid
         *  dollar balance and publishes its price in dollars, so the
         *  pool IS US dollars. */
        credits: { default: { label: "US dollars" } },
        /** $0.02 per ranked-list call (published in the API's own
         *  OpenAPI `info.description`, 2026-10-12). `/company`
         *  overrides with $0.01, `/groups` with FREE. No `consolidate`: no response body carries a
         *  meter. */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "ranked list",
            consumes: { credit: "default", amount: 0.02 },
        },
    },
});
