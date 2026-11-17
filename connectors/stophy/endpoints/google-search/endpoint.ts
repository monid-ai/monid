import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleSearchBody } from "./schema/inputs.ts";

const shape = zGoogleSearchBody.shape;

/**
 * `POST /v1/google/search` — Google's web results, with AI Overview,
 * knowledge graph, People also ask and related searches when Google shows
 * them.
 *
 * Rate card: 1 unit per call, plus 1 unit for each result that comes back
 * with its page text (`markdown`) when `scrapeResults` is on — a COMPOSITE.
 * An empty `results` bills nothing. `scrapeResults` and `scrapeLimit` carry
 * the vendor's documented defaults (false, 3) at the binding, so the
 * estimate reads the real knob.
 */
export default defineEndpoint({
    meta: {
        displayName: "Stophy Google Search",
        summary: "Google web results, optionally with each top page's text.",
        description: "Search Google and get ranked results " +
            "(`type`, `url`, `title`, `description`, `position`) plus " +
            "`aiOverview`, `knowledgeGraph`, `peopleAlsoAsk` and " +
            "`relatedSearches` when Google shows them. Filter by " +
            "`country`, `language`, `time`, `includeDomains` / " +
            "`excludeDomains` and `safeSearch`; page with `page`. Set " +
            "`scrapeResults` to read the top `scrapeLimit` pages (1-5, " +
            "default 3) in the same call: each web result then carries " +
            "its text as `markdown`, or `scrapeError` when the page could " +
            "not be read. Best for general pages; for recent news use " +
            "`stophy#google/news`.",
        docsUrl: "https://docs.stophy.dev/api-reference/endpoint/google-search",
        categories: ["web-search"],
        notes: [
            "1 Stophy call when results come back; an empty answer is free. " +
            "With scrapeResults on, each result that comes back with its " +
            "page text costs 1 more.",
        ],
    },
    request: { method: "POST", path: "/google/search" },
    input: {
        schema: {
            body: zGoogleSearchBody.extend({
                scrapeResults: shape.scrapeResults.unwrap().default(false),
                scrapeLimit: shape.scrapeLimit.unwrap().default(3),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                call: {
                    kind: UsageModelKind.PER_UNIT,
                    consumes: { credit: "default", amount: 1 },
                    unit: Unit.RESULT,
                    label: "searches with results",
                    description: "one search that returned at least one result",
                },
                read_page: {
                    kind: UsageModelKind.PER_UNIT,
                    consumes: { credit: "default", amount: 1 },
                    unit: Unit.PAGE,
                    label: "pages read",
                    description:
                        "results that came back with their page text (scrapeResults)",
                },
            },
        },
        /** Worst case: a call with results, plus every requested page read. */
        estimate: ({ data }) => {
            const n = data.input.body.scrapeResults
                ? data.input.body.scrapeLimit
                : 0;
            return { counts: n > 0 ? { call: 1, read_page: n } : { call: 1 } };
        },
        /** The call bills only when `results` is non-empty; pages count
         *  results that came back carrying a non-empty `markdown`. */
        evidence: ({ data, utils }) => {
            const results = utils.json.optionalGet(
                data.output,
                "$.data.results",
            );
            const call = Array.isArray(results) && results.length > 0 ? 1 : 0;
            const n = Array.isArray(results)
                ? results.filter((r) =>
                    typeof r === "object" && r !== null &&
                    typeof (r as Record<string, unknown>).markdown ===
                        "string" &&
                    ((r as Record<string, unknown>).markdown as string)
                            .length > 0
                ).length
                : 0;
            return { counts: n > 0 ? { call, read_page: n } : { call } };
        },
    },
});
