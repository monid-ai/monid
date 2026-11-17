import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `ai/answers` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/ai/answers). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zAiAnswersBody = z.object({
    prompts: z.array(z.string())
        .describe(
            "One or more questions to ask the AI assistants, up to 2,000 characters each.",
        ),
    assistants: z.array(
        z.enum([
            "chatgpt",
            "gemini",
            "perplexity",
            "claude",
            "google-ai-mode",
            "google-ai-overview",
        ]),
    )
        .describe("Which AI assistants to query for each prompt.")
        .optional(),
    country: z.enum([
        "AU",
        "BR",
        "CA",
        "FR",
        "DE",
        "IN",
        "IT",
        "JP",
        "MX",
        "NL",
        "ZA",
        "KR",
        "ES",
        "GB",
        "US",
    ])
        .describe(
            "Country the assistants answer from, e.g. United States. Defaults to United States.",
        )
        .optional(),
}).strict();
