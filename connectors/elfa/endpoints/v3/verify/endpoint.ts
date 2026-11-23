import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zV3VerifyBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Verify a Statement",
        summary:
            "Fact-check a market claim against X posts, public Telegram channels and web pages.",
        description: "Checks one statement against X posts and public " +
            "Telegram channels from up to a week before `asOf`, and web " +
            "pages published by then, and returns a verdict (`supported`, `contradicted` or " +
            "`notEnoughEvidence`), the probability of each, and up to 10 " +
            "items judged, each with its link, how decisive it is alone, " +
            "and whether the verdict rests on it. `notEnoughEvidence` " +
            "also covers no posts or pages found, and a most likely " +
            "verdict under 0.5. Pass `asOf` to judge the claim as of an " +
            "earlier moment, `context` for background such as how a " +
            "market resolves (never treated as evidence), and `decision` " +
            "to also get a yes/no answer, one of your options, or a place " +
            "on your scale from the same evidence. `coverage` says which " +
            "sources could be read; a verdict with `complete: false` may " +
            "have missed items that would change it.",
        docsUrl: "https://docs.elfa.ai/api/v3/endpoints/verify",
        categories: ["crypto-signals", "news-search", "twitter"],
        notes: [
            "1 credit per request, whatever the verdict.",
            "A 503 means verification is unavailable; retry.",
            "Choice labels must be unique within the request.",
        ],
    },
    request: { method: "POST", path: "/v3/verify" },
    input: {
        schema: { body: zV3VerifyBody, queryParams: z.object({}).strict() },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
