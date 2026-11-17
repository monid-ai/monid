import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `slack/apps` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/slack/apps). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zSlackAppsBody = z.object({
    category: z.enum([
        "AI Apps & Assistants",
        "Analytics",
        "Brilliant Bots",
        "Communication",
        "Customer Support",
        "Daily Tools",
        "Design",
        "Developer Tools",
        "Enterprise-ready apps",
        "Essential Apps",
        "Featured",
        "File Management",
        "Finance",
        "Health & Wellness",
        "HR & Team Culture",
        "Marketing",
        "MCP registry",
        "Media & News",
        "New & Noteworthy",
        "Office Management",
        "Productivity",
        "Project Management",
        "Sales",
        "Security & Compliance",
        "Social & Fun",
        "Travel",
        "Voice & Video",
        "Working from home",
    ])
        .describe("Category to use."),
    pricing: z.enum(["All", "Free", "Paid", "Free and paid"])
        .describe("Pricing to use. All by default.")
        .optional(),
    maxResults: z.number().int().max(200)
        .describe(
            "How many apps to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
