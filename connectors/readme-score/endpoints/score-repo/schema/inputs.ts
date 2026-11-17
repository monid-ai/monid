import { z } from "zod";

/** GET /api/score query — the vendor mirror (github.com/flisk-sh/readme-score
 *  README "Routes", 2026-11-11). An unknown or private repository answers
 *  404 `{"error": "<owner>/<repo> is not a public GitHub repository."}`. */
export const zScoreRepoQueryParams = z.object({
    repo: z.string().min(1).describe(
        "A public GitHub repository as 'owner/repo', for example " +
            "'flisk-sh/flisk'.",
    ),
    type: z.enum(["cli", "library", "app", "api"]).describe(
        "Score it as this kind of project instead of the detected one: " +
            "a CLI tool, a library, a full-stack app or a backend API.",
    ).optional(),
}).strict();
