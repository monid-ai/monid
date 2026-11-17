import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zGoogleNewsBody } from "./schema/inputs.ts";

/**
 * `POST /v1/google/news` — Google News articles for a query, or the top
 * headlines of one section. 1 unit per call, billed only when `results`
 * is non-empty ⇒ leaf PER_UNIT counted off the response.
 */
export default defineEndpoint({
    meta: {
        displayName: "Stophy Google News",
        summary: "Google News articles for a query, or a section's headlines.",
        description: "Search Google News and get articles " +
            "(`url`, `title`, `source`, `description`, `publishedAt`, " +
            "`position`). Send `query` to search, or `topic` (world, " +
            "nation, business, technology, entertainment, sports, " +
            "science, health) for that section's top 10 headlines — one " +
            "or the other. `sort: newest` puts the latest first; `time`, " +
            "`country`, `language` and the domain lists narrow it; page " +
            "with `page` (1-10). Best for recent news; for general pages " +
            "use `stophy#google/search`.",
        docsUrl: "https://docs.stophy.dev/api-reference/endpoint/google-news",
        categories: ["news-search"],
        notes: [
            "1 Stophy call when results come back; an empty answer is free.",
        ],
    },
    request: { method: "POST", path: "/google/news" },
    input: {
        schema: {
            body: z.union([
                zGoogleNewsBody.omit({ topic: true }).required({ query: true }),
                zGoogleNewsBody.omit({ query: true }).required({ topic: true }),
            ]),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "news calls with results",
            description: "one call that returned at least one article",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** Bills only when `results` is non-empty — Stophy charges nothing
         *  for an empty answer. */
        evidence: ({ data, utils }) => {
            const results = utils.json.optionalGet(
                data.output,
                "$.data.results",
            );
            return {
                counts: {
                    RESULT: Array.isArray(results) && results.length > 0
                        ? 1
                        : 0,
                },
            };
        },
    },
});
