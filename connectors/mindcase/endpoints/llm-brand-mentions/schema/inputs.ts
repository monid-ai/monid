import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `llm/brand-mentions` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/llm/brand-mentions). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zLlmBrandMentionsBody = z.object({
    prompts: z.array(z.string())
        .describe("One or more prompts. One request reads them all."),
    brand: z.string()
        .describe("Brand."),
    brandAliases: z.array(z.string())
        .describe("One or more brand aliases. One request reads them all.")
        .optional(),
    brandWebsite: z.string()
        .describe("Brand Website.")
        .optional(),
    competitors: z.array(z.string())
        .describe("One or more competitors. One request reads them all.")
        .optional(),
    assistants: z.array(
        z.enum(["chatgpt", "gemini", "google_ai_mode", "google_ai_overview"]),
    )
        .describe(
            "Which AI assistants to ask: ChatGPT, Gemini, Google AI Mode, Google AI Overview. Each assistant gives one answer (one row) per prompt, so 3 prompts on 2 assistants is 6 answers. Defaults to ChatGPT.",
        )
        .optional(),
    country: z.string()
        .describe(
            "Country the prompts are asked from, e.g. United Kingdom. Defaults to United States. Accepts one of 249 values; list them with GET https://api.mindcase.co/v1/data/llm/brand-mentions?expand=options.",
        )
        .optional(),
}).strict();
