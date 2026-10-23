import { defineProvider, presets } from "@shared/core";

/**
 * TypeSafe (typesafe.ai) — Jev, a "System One" decision model: one
 * stateless synchronous endpoint (`POST /v1/systemone`) that evaluates a
 * state against typed questions and returns calibrated, typed answers.
 * Ported from monid-services `adaptors/typesafe`.
 *
 * Auth is `Authorization: Bearer <key>`. Non-2xx (422 validation, plus the
 * 401/429/529 monid-services observed) is data, zero-billed.
 *
 * Pricing: TypeSafe publishes its rate in dollars — $42 per billion INPUT
 * tokens, output tokens free (docs.typesafe.ai/models) — so the one pool
 * is US dollars.
 */
export default defineProvider({
    name: "typesafe",
    meta: {
        displayName: "TypeSafe",
        summary: "Typed, calibrated AI judgments your code can branch on.",
        description: "TypeSafe Jev — a System One decision model: send any " +
            "state (text or structured JSON) plus typed questions and get " +
            "calibrated judgments back in one sub-second call — classify " +
            "into your own options, score on your own rubric, or verify " +
            "yes/no claims, each with probabilities and confidence your " +
            "code can branch on. Batch many questions against one state in " +
            "a single request.",
        homepageUrl: "https://typesafe.ai",
        docsUrl: "https://docs.typesafe.ai",
        categories: ["agents"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.typesafe.ai" },
    // monid-services parity: 30 s request budget (endpointExecution
    // config.yml) — the model answers well under a second.
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: { credits: { default: { label: "US dollars" } } },
});
