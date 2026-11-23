import { z } from "zod";

export const zV3VerifyBody = z.object({
    statement: z.string().max(500).regex(/\S/).describe(
        "The claim to check, up to 500 characters.",
    ),
    asOf: z.number().int().nonnegative().max(4_102_444_800).describe(
        "Unix seconds. Judge the statement as of this moment: no post " +
            "after it, and no web page dated after it, is read. Default " +
            "now. At most 30 days ago and at most 5 minutes ahead.",
    ).optional(),
    context: z.string().max(4000).regex(/\S/).describe(
        "Background the judgement may use, up to 4,000 characters, such " +
            "as how a market resolves. It is never treated as evidence.",
    ).optional(),
    decision: z.discriminatedUnion("type", [
        z.object({
            type: z.literal("yesNo"),
            yes: z.string().max(500).regex(/\S/).describe(
                "What counts as yes, up to 500 characters.",
            ).optional(),
            no: z.string().max(500).regex(/\S/).describe(
                "What counts as no, up to 500 characters.",
            ).optional(),
        }).strict().describe("A yes or no answer."),
        z.object({
            type: z.literal("choice"),
            options: z.array(
                z.object({
                    label: z.string().max(100).regex(/\S/).describe(
                        "Up to 100 characters, unique within the request.",
                    ),
                    definition: z.string().max(500).regex(/\S/).describe(
                        "When this option applies, up to 500 characters.",
                    ),
                }).strict(),
            ).min(2).max(20).describe("2 to 20 options."),
        }).strict().describe("One of the caller's options."),
        z.object({
            type: z.literal("score"),
            levels: z.array(z.string().max(200).regex(/\S/)).min(2).max(10)
                .describe(
                    "2 to 10 levels, lowest first, each up to 200 " +
                        "characters.",
                ),
        }).strict().describe("A place on the caller's scale."),
    ]).describe(
        "A question to answer from the same evidence, beyond the verdict.",
    ).optional(),
}).strict();
