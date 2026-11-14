import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zWebSearchBody } from "./schema/inputs.ts";

/**
 * `POST /v1/web-search`: one call, one reply. The default search answers the
 * question from the live web and names the page behind each value; the fast
 * search returns the results alone in about a second.
 *
 * Billing (https://specstream.ai/agents.md, 2026-11-14): a search of up to 10
 * results is $0.005, and each started block of 10 more adds $0.006. A fast
 * or news search is $0.001, and each block of 10 more adds $0.0012. The
 * reply carries the dollars taken as `data.price_usd`; that receipt settles
 * (design D27) and the same rule is the estimate. An error reply has no
 * receipt and bills nothing.
 */
export default defineEndpoint({
    meta: {
        displayName: "SpecStream Search",
        summary:
            "Answer a question from the live web, each value with its source page.",
        description:
            "Search the live web in one call. The default search reads the " +
            "pages it finds and returns `answer` (the value, the page it " +
            "came from and when it was read) for a question of fact, or " +
            "`rows` for a request that asks for several things, together " +
            "with `sources`, the results it read with title, URL and " +
            "snippet. Set `speed` to `fast` for the search results alone " +
            "in about a second at a fifth of the price, `news` for news " +
            "items newest first, and `passages` to get the text of the " +
            "top pages in the same reply. Search operators such as " +
            "`site:`, `filetype:`, `after:` and `before:` hold on every " +
            "result. To read a result's whole page, pass its URL to " +
            "`specstream#v1/extract`. For a complete table of every match " +
            "with the same facts on each row, start at " +
            "`specstream#v1/parse`.",
        docsUrl: "https://specstream.ai/docs/search-api",
        categories: ["web-search", "news-search"],
        notes: [
            "$0.005 a search of up to 10 results; $0.001 with " +
            "`speed: fast` or `news`. The reply states its own price in " +
            "`data.price_usd`.",
            "`answer` is null when the pages read do not settle one " +
            "value; `sources` still holds what was read.",
        ],
    },
    request: { method: "POST", path: "/v1/web-search" },
    input: { schema: { body: zWebSearchBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            label: "hundredths of a cent charged",
            description: "the price SpecStream states for the search in " +
                "`data.price_usd`, in hundredths of a cent: 50 for a " +
                "search of up to 10 results, 10 for a fast or news search",
            consumes: { credit: "default", amount: 0.0001 },
        },
        /** The vendor's own receipt. Omitted when absent, so the derived
         *  fold stands in. */
        consolidate: ({ data, utils }) => {
            const usd = utils.json.optionalNum(data.output, "$.data.price_usd");
            return {
                credits: { ...(usd !== undefined ? { default: usd } : {}) },
            };
        },
        /** The published price rule, applied to the request. */
        estimate: ({ data }) => {
            const body = data.input.body;
            const fast = body.speed === "fast" || body.news === true;
            const more = Math.max(0, Math.ceil(((body.num ?? 10) - 10) / 10));
            return {
                counts: { "CREDIT": fast ? 10 + 12 * more : 50 + 60 * more },
            };
        },
        evidence: ({ data, utils }) => ({
            counts: {
                "CREDIT": Math.round(
                    (utils.json.optionalNum(data.output, "$.data.price_usd") ??
                        0) * 10000,
                ),
            },
        }),
    },
});
