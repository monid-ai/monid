import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zContentsOptions } from "../../schema/contents-options.ts";
import { zExaDeepSearchBody } from "./schema/inputs.ts";

/**
 * Exa Deep Search — `POST /search` with a deep search type: several
 * searches, read and reasoned over, optionally filling a caller's JSON
 * Schema (`outputSchema` → `output.content`, sources in
 * `output.grounding`).
 *
 * Its own endpoint rather than a `type` value on exa#search: an agent
 * looking for multi-step research reads the capability and its price from
 * the endpoint it discovers. The PUBLIC identity is `/search/deep`
 * (design D22); the wire path is the shared `/search`.
 *
 * Flat billing: $0.012 per call for deep-lite or deep, capped at 10
 * results without result summaries. Exa's own costDollars.total settles
 * every run (provider consolidate).
 *
 * Deep runs take longer than the provider's 30 s budget allows, so the
 * endpoint overrides it.
 */
export default defineEndpoint({
    meta: {
        displayName: "Exa Deep Search",
        summary: "Research a question across many searches and get JSON " +
            "answers with a source for each field.",
        description: "Runs several searches, reads the results and fills " +
            "the JSON Schema you pass in outputSchema. The answer is in " +
            "output.content and the sources for each field are in " +
            "output.grounding. Use it for wide schemas, comparisons and " +
            "questions that take more than one search. deep is the default. " +
            "deep-lite is a lighter pass. $0.012 per call, up to 10 results. " +
            "For deep-reasoning, more than 10 results or result summaries, " +
            "use Exa Search.",
        docsUrl: "https://exa.ai/docs/reference/search",
        categories: ["web-search"],
    },
    endpoint: "/search/deep",
    request: { method: "POST", path: "/search" },
    timeouts: { requestMs: 180_000, runMs: 190_000 },
    input: {
        schema: {
            // Keep the flat-price limits at the binding, not the vendor mirror.
            body: zExaDeepSearchBody.extend({
                type: z.enum(["deep-lite", "deep"]).default("deep"),
                numResults: zExaDeepSearchBody.shape.numResults.unwrap()
                    .max(10).describe("Number of results (1-10).").default(10),
                contents: zContentsOptions.omit({ summary: true }).strict()
                    .optional(),
                moderation: zExaDeepSearchBody.shape.moderation.unwrap()
                    .default(false),
            }),
        },
        // same defense-in-depth as exa#search: `stream` is not exposed, and
        // a pasted payload carrying it is stripped before send.
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.omit(data.input.body ?? {}, ["stream"]),
        }),
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.012 },
        },
    },
});
