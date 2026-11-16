import { defineProvider, presets } from "@shared/core";

/**
 * SpecStream (specstream.ai): live web search and page reading for agents.
 * One host (`https://api.specstream.ai`), one Bearer API key, two endpoints:
 *
 *   `v1/web-search`   a question -> the answer and the results read
 *   `v1/extract`      up to 20 URLs -> each page's main text
 *
 * Billing (https://specstream.ai/agents.md and https://specstream.ai/pricing,
 * 2026-11-14): both endpoints answer in one call and carry their price on the
 * reply (`data.price_usd`). Search is $0.005 for up to 10 results ($0.001 on
 * the fast tier or news), and Extract is $0.0008 per page read (pages that
 * give no text are not charged). Each endpoint declares its own `PER_UNIT`
 * model on `Unit.CREDIT` in hundredths of a cent and settles on
 * `data.price_usd` via `usage.consolidate` (design D27).
 *
 * Vendor non-2xx is DATA: errors arrive as
 * `{ error: { code, message, details? } }`, normalized by `output.fromError`
 * and zero-billed by the engine.
 */
export default defineProvider({
    name: "specstream",
    meta: {
        displayName: "SpecStream",
        summary: "Web search with sourced answers and live page reading.",
        description:
            "SpecStream is the live web data engine for teams and agents. " +
            "Search answers a question from the live web in one call, " +
            "with the page behind each value, or returns the results " +
            "alone in about a second on the fast tier. Extract reads up " +
            "to 20 pages live and returns each page's main text. " +
            "A search is $0.005 of up to 10 results, or $0.001 on the " +
            "fast tier, and a page read is $0.0008.",
        homepageUrl: "https://specstream.ai",
        docsUrl: "https://specstream.ai/docs/api",
        categories: ["web-search", "web-scraping"],
        notes: [
            "Every response wraps its payload in `{ data }`; an error is " +
            "`{ error: { code, message } }`.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.specstream.ai" },
    timeouts: { requestMs: 60_000, runMs: 65_000 },
    usage: {
        /** THE credit system (design D26): SpecStream prices in dollars (and
         *  settles the same numbers in euros for euro accounts), so the pool is
         *  US dollars, like exa. Both endpoints declare their own metered model. */
        credits: { default: { label: "US dollars" } },
    },
    output: {
        /** SpecStream's error envelope is `{ error: { code, message, details? } }`.
         *  Vendor non-2xx is DATA, zero-billed by the engine. */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(
                data.output,
                "$.error.message",
            );
            const code = utils.json.optionalGet(data.output, "$.error.code");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "SpecStream API error",
                ...(typeof code === "string" ? { code } : {}),
                raw: data.output,
            };
        },
    },
});
