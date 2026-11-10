import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTrustmebroVerifyBody } from "./schema/inputs.ts";

/** POST /v1/verify - one claim in, a verdict receipt with sources out. */
export default defineEndpoint({
    meta: {
        displayName: "Trust Me Bro Verify Claim",
        summary: "Fact-check one claim: verdict plus the sources behind it.",
        description: "Send one written claim (up to 600 characters) and get " +
            "back a receipt: a verdict (for example SUPPORTED, CONTESTED, " +
            "REFUTED, OVERSTATED, IMPRECISE or INSUFFICIENT_EVIDENCE), a " +
            "summary, and the sources that support or oppose the claim. " +
            "The `source` field says how the answer was made: 'retrieved' " +
            "means the claim was already checked and the stored receipt " +
            "came back; 'constructed' means a new check ran. " +
            "It will not give legal or medical advice, it does not " +
            "guarantee a confidence level, and some checks end in " +
            "INSUFFICIENT_EVIDENCE: that is a real answer, and it is " +
            "billed like any other answer. " +
            "Cost differs about 3x between the two paths ($0.003 for a " +
            "retrieved receipt, $0.01 for a constructed check). " +
            "A first check of a new claim can take up to 30 seconds; a " +
            "retrieved receipt is much faster. " +
            "A check can publish a public receipt, so never send " +
            "confidential or personal text. " +
            "One claim per call; for a whole document, split it into " +
            "separate claims first.",
        docsUrl: "https://trustmebro.to/api",
        categories: ["fact-checking"],
        notes: [
            "Latency: a new (constructed) check ran 18 to 28 seconds in " +
            "TMB's own measurements. Retrieved receipts return in a few " +
            "seconds.",
            "Failed checks are not billed: a 503 verification_failed, a " +
            "402 insufficient funds and a 429 rate limit all settle at " +
            "zero.",
            "Results may become public receipts on trustmebro.to. Never " +
            "send confidential or personal text.",
        ],
    },
    request: { method: "POST", path: "/v1/verify" },
    input: { schema: { body: zTrustmebroVerifyBody } },
    // Runs of 18.7 to 27.6 s were measured; 60 s leaves room for the
    // slow tail without cutting off a call TMB already counted.
    timeouts: { requestMs: 60_000, runMs: 60_000 },
    usage: {
        /** COMPOSITE of two mutually exclusive metered lines. Exactly one
         *  line counts 1 per successful call, chosen by the `source` field
         *  of the 200 body. (Two flat PER_CALL lines would BOTH bill, so
         *  both lines are PER_UNIT with a count of 0 or 1.)
         *  Prices are TMB's list prices in US dollars:
         *  PRICE_RETRIEVED = 3,000 micros, PRICE_CONSTRUCTED = 10,000. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                retrieved: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "retrieved receipt",
                    consumes: { credit: "default", amount: 0.003 },
                },
                constructed: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "constructed check",
                    consumes: { credit: "default", amount: 0.01 },
                },
            },
        },
        /** Pre-run hold: the worst case, a constructed check. */
        estimate: () => ({ counts: { retrieved: 0, constructed: 1 } }),
        /** Settle: read `source` off the 200 body. Non-2xx never reaches a
         *  count (the engine zero-bills every non-2xx envelope). An
         *  unknown or missing `source` on a 200 counts as retrieved, the
         *  cheaper line: the caller is never charged the higher price on
         *  a value this fn does not recognize. */
        evidence: ({ data, utils }) => {
            const source = utils.json.optionalGet(data.output, "$.source");
            const constructed = source === "constructed";
            return {
                counts: {
                    retrieved: constructed ? 0 : 1,
                    constructed: constructed ? 1 : 0,
                },
            };
        },
    },
});
