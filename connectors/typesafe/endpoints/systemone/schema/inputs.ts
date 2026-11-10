import { z } from "zod";

/**
 * `POST /v1/systemone` body — monid-services `adaptors/typesafe`
 * (fa6ab6ac) is the contract: same fields, same strictness, same text.
 * Two vendor surfaces are NOT exposed there or here: `assets` (images,
 * base64 or multipart) and the `box` question type, both gated behind
 * the `TypeSafe-Danger-Zone-Images` header.
 *
 * v1's two `.refine()` cardinality checks (at least one question; 1-255
 * choice options) do not survive compilation, so they ride `.meta()` as
 * `minProperties` / `maxProperties`, which reach the compiled JSON Schema
 * the engine validates against.
 */

/**
 * Upstream "string | object | array" rich-text value — used by `state`,
 * `instructions`, and criteria descriptions. An object can hold the
 * question in one field and the data it refers to in sibling fields.
 */
const zRichValue = z.union([
    z.string(),
    z.record(z.string(), z.unknown()),
    z.array(z.unknown()),
]);

const zNoulQuestion = z.object({
    type: z.literal("noul"),
    instructions: zRichValue.describe(
        "The yes/no question to evaluate against the state.",
    ),
    criteria: z.object({
        true: zRichValue.describe("What a yes (value near 1) means.")
            .optional(),
        false: zRichValue.describe("What a no (value near 0) means.")
            .optional(),
    }).describe("Optional descriptions of what a yes and a no mean.")
        .optional(),
}).describe("Yes/no question — answers with the probability of yes (0-1).");

const zChoiceQuestion = z.object({
    type: z.literal("choice"),
    instructions: zRichValue.describe("What the model should decide."),
    criteria: z.record(z.string().min(1), zRichValue.nullable()).meta({
        description: "Map of option -> rubric description (null when an " +
            "option needs no extra detail). Max 255 options.",
        minProperties: 1,
        maxProperties: 255,
    }),
}).describe(
    "Pick one option from your set — answers with the chosen option, a " +
        "probability per option, and confidence.",
);

const zScoreQuestion = z.object({
    type: z.literal("score"),
    instructions: zRichValue.describe("What the model should rate."),
    criteria: z.array(zRichValue).min(2).max(10).describe(
        "Ordered level descriptions, low to high (2-10 levels).",
    ),
}).describe(
    "Rate the state along your rubric — answers with a " +
        "probability-weighted score (can land between levels), a " +
        "probability per level, and confidence.",
);

export const zSystemoneBody = z.object({
    state: zRichValue.describe(
        "The content to evaluate: a plain string, or structured JSON " +
            "(object/array) for records, chat logs, or application state. " +
            "All questions see this same state. Prefer an object so each " +
            "part of the context has a descriptive name.",
    ),
    // A free string, not v1's enum (repo rule): an unknown model is
    // TypeSafe's zero-billed 422. describe BEFORE optional: the binding
    // unwraps this field to attach its default.
    model: z.string().min(1).describe(
        'Model: "jev-latest" (current stable, the default), ' +
            '"jev-preview" (newest release), or a pinned version. The ' +
            "output reports the versioned model that answered.",
    ).optional(),
    questions: z.record(
        z.string().min(1),
        z.discriminatedUnion("type", [
            zNoulQuestion,
            zChoiceQuestion,
            zScoreQuestion,
        ]),
    ).meta({
        description: "Map of your ids -> typed questions (noul | choice | " +
            "score), all evaluated in parallel against the state in ONE " +
            "call. Answers come back under the same ids. Batch liberally — " +
            "extra questions barely change latency or cost.",
        minProperties: 1,
    }),
}).strict();
