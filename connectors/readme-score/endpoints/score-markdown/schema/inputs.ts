import { z } from "zod";

/** POST /api/score body — the vendor mirror (github.com/flisk-sh/readme-score
 *  README "Routes", 2026-11-11). A missing or non-string `readme` answers
 *  400 `{"error": "readme must be the README's Markdown."}`. */
export const zScoreMarkdownBody = z.object({
    readme: z.string().min(1).describe("The README, as Markdown text."),
    type: z.enum(["cli", "library", "app", "api"]).describe(
        "Score it as this kind of project instead of the detected one.",
    ).optional(),
    website: z.string().min(1).describe(
        "The product's website address, to compare its headline and " +
            "description with the README. Omit to skip the website checks.",
    ).optional(),
}).strict();
