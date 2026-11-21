import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSearchLibraryBody } from "./schema/inputs.ts";

/**
 * `POST /api/v1/tools/search_library`: search the documented strategy
 * library. FREE to the caller. Strict body at the binding.
 */
export default defineEndpoint({
    meta: {
        displayName: "QuantGPT Search Library",
        summary: "Search a library of documented investing strategies.",
        description: "Searches QuantGPT's library of documented " +
            "strategies (quant papers, well known investors, partnership " +
            "letters, seasonal patterns, IBD-style rules). Each match " +
            "returns its id, name, category, source, thesis, criteria and " +
            "tags, whether it runs as a backtest, and, when it does, how " +
            "the run differs from its source. When no entry matches every " +
            "word the closest matches come back, marked closest_matches " +
            "with matched_words on each. A library entry describes a " +
            "published idea, not a recommendation or a forecast. To test " +
            "an entry's criteria over history use " +
            "quantgpt#tools/run_backtest.",
        categories: ["equities"],
        notes: ["Free."],
    },
    request: { method: "POST", path: "/tools/search_library" },
    input: { schema: { body: zSearchLibraryBody.strict() } },
    usage: {
        model: { kind: UsageModelKind.FREE },
    },
});
