import { z } from "zod";

/**
 * `POST /v1/systemone` body — the vendor mirror (docs.typesafe.ai/api,
 * checked 2026-10-21). Two vendor surfaces are NOT mirrored, matching the
 * hosted catalog: `assets` (images, base64 or multipart) and the `box`
 * question type, both gated behind the `TypeSafe-Danger-Zone-Images`
 * header.
 */

/** "string | object | array" — `state`, `instructions`, and criteria. */
const zRichValue = z.union([
    z.string(),
    z.record(z.string(), z.unknown()),
    z.array(z.unknown()),
]);

const zNoulQuestion = z.object({
    type: z.literal("noul"),
    instructions: zRichValue.optional().describe(
        "The yes/no question to evaluate against the state.",
    ),
    criteria: z.object({
        true: zRichValue.optional().describe("What a yes (near 1) means."),
        false: zRichValue.optional().describe("What a no (near 0) means."),
    }).optional().describe("What a yes and a no mean."),
}).describe("Yes/no question — answers with the probability of yes (0-1).");

const zChoiceQuestion = z.object({
    type: z.literal("choice"),
    instructions: zRichValue.optional().describe(
        "What the model should decide.",
    ),
    criteria: z.record(z.string().min(1), zRichValue.nullable()).describe(
        "Map of option -> rubric description (null when an option needs no " +
            "detail). 1 to 255 options.",
    ),
}).describe(
    "Pick one option from your set — answers with the chosen option, a " +
        "probability per option, and confidence.",
);

const zScoreQuestion = z.object({
    type: z.literal("score"),
    instructions: zRichValue.optional().describe(
        "What the model should rate.",
    ),
    criteria: z.array(zRichValue).min(1).max(10).describe(
        "Ordered level descriptions, low to high (1-10 levels).",
    ),
}).describe(
    "Rate the state along your rubric — answers with a probability-weighted " +
        "score, a probability per level, and confidence.",
);

export const zSystemoneBody = z.object({
    model: z.string().min(1).optional().describe(
        'Model name or alias: "jev-latest" (current stable), "jev-preview" ' +
            "(newest release), or a pinned version. The response reports " +
            "the versioned model that answered.",
    ),
    state: zRichValue.describe(
        "The content to evaluate: a plain string, or structured JSON " +
            "(object or array) for records, chat logs, or application " +
            "state. Every question sees this same state.",
    ),
    questions: z.record(
        z.string().min(1),
        z.discriminatedUnion("type", [
            zNoulQuestion,
            zChoiceQuestion,
            zScoreQuestion,
        ]),
    ).describe(
        "Map of your ids -> typed questions (noul, choice, score), all " +
            "evaluated in parallel against the state in one call. Answers " +
            "come back under the same ids. Batch liberally — extra " +
            "questions barely change latency or cost.",
    ),
}).strict();
