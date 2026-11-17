import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `zillow/agents` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/zillow/agents). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zZillowAgentsBody = z.object({
    location: z.string()
        .describe("Location."),
    maxResults: z.number().int()
        .describe(
            "How many agents to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
    languages: z.array(
        z.enum([
            "american-sign-language",
            "arabic",
            "bengali",
            "cantonese",
            "farsi",
            "french",
            "german",
            "greek",
            "haitian-creole",
            "hebrew",
            "hindi",
            "hungarian",
            "italian",
            "japanese",
            "korean",
            "mandarin",
            "polish",
            "portuguese",
            "russian",
            "spanish",
            "filipino",
            "thai",
            "turkish",
            "ukrainian",
            "vietnamese",
        ]),
    )
        .describe(
            "Only agents who speak one of these languages. Leave empty for any.",
        )
        .optional(),
    specialtys: z.array(
        z.enum([
            "first-time-home-buyers",
            "investment-properties",
            "rentals",
            "military-or-veterans",
            "luxury-homes",
            "new-construction",
            "property-management",
            "senior-communities",
            "relocation",
            "foreclosure",
            "lot-or-land",
            "vacation-short-term-rentals",
        ]),
    )
        .describe(
            "Only agents with one of these specialties. Leave empty for any.",
        )
        .optional(),
}).strict();
