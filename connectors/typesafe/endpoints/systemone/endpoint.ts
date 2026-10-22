import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSystemoneBody } from "./schema/inputs.ts";

/** POST /v1/systemone — typed AI judgments over any state. */
export default defineEndpoint({
    meta: {
        displayName: "Jev System One Evaluation",
        summary: "Evaluate typed questions against any state and get " +
            "calibrated structured judgments.",
        description: "Make fast, structured AI judgments your code can " +
            "branch on — no prompting, no text parsing. Send a state (plain " +
            "text or structured JSON: a ticket, a record pair, a chat log) " +
            "plus a map of typed questions and get typed answers back in " +
            "one sub-second call: noul answers a yes/no with a calibrated " +
            "probability, choice classifies into your own options with a " +
            "full probability distribution and confidence, score rates on " +
            "your own rubric with a probability-weighted value. Every " +
            "question is evaluated in parallel against the same state, so " +
            "batching many judgments into one call barely changes latency " +
            "or cost. Suited for triage and intent routing, guardrails, " +
            "re-ranking, entity matching and dedup, claim verification, " +
            "and confidence-gated escalation.",
        docsUrl: "https://docs.typesafe.ai/api",
        categories: ["agents"],
        notes: [
            "Billed per INPUT token only; output tokens are free.",
        ],
    },
    endpoint: "/systemone",
    request: { method: "POST", path: "/v1/systemone" },
    input: {
        // `model` is required upstream; the binding defaults it to
        // "jev-latest" (the alias for the current stable release), so
        // callers of the hosted catalog that omit it keep working.
        schema: {
            body: zSystemoneBody.extend({
                model: zSystemoneBody.shape.model.unwrap().default(
                    "jev-latest",
                ),
            }),
        },
    },
    usage: {
        /** $42 per billion input tokens = $0.000000042 per token
         *  (docs.typesafe.ai/models), one flat rate for every model. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.TOKEN,
            label: "input tokens",
            consumes: { credit: "default", amount: 0.000000042 },
        },
        /** A provable CEILING on input tokens: the UTF-8 byte length of the
         *  serialized body (byte-level BPE consumes at least one byte per
         *  token). `encodeURIComponent` counts the bytes: every %XX is one
         *  byte, every other character one ASCII byte. */
        estimate: ({ data }) => ({
            counts: {
                "TOKEN": encodeURIComponent(JSON.stringify(data.input.body))
                    .replace(/%[0-9A-F]{2}/g, "x").length,
            },
        }),
        /** The vendor's `usage.input_tokens` (absent ⇒ 0, never a guessed
         *  charge). */
        evidence: ({ data, utils }) => ({
            counts: {
                "TOKEN": utils.json.optionalNum(
                    data.output,
                    "$.usage.input_tokens",
                ) ?? 0,
            },
        }),
    },
});
