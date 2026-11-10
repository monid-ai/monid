import { defineEndpoint } from "@shared/core";
import { zHangingContextAskQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Hanging Context Ask",
        summary: "Answer a news question from recent cited stories.",
        description: "Ask a question in plain words and get the recent " +
            "Hanging Context stories that answer it, best match first: " +
            "headline, URL, publication time, the matching fact copied " +
            "word for word, and the Synorb Manifest ids it cites. Uses no " +
            "language model, so it adds nothing that is not in the " +
            "stories. `no_match: true` with an empty `results` list means " +
            "recent stories do not cover the question; the reply then " +
            "suggests topics. Follow a result with Hanging Context Story " +
            "for the full text and sources.",
        docsUrl: "https://hangingcontext.com/developers/",
    },
    request: { method: "GET", path: "/ask" },
    input: {
        schema: {
            // Our tightening (D25): without `query` the vendor returns a
            // help page, which answers nothing, so the caller must ask.
            queryParams: zHangingContextAskQueryParams.required({
                query: true,
            }),
        },
    },
});
