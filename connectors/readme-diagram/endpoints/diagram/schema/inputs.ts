import { z } from "zod";

/** GET /{owner}/{repo}.svg path params — the vendor mirror
 *  (github.com/flisk-sh/readme-diagram README, 2026-11-12). */
export const zDiagramPathParams = z.object({
    owner: z.string().min(1).describe(
        "GitHub user or organization that owns the repository, for example " +
            "'flisk-sh'.",
    ),
    repo: z.string().min(1).describe(
        "Repository name without '.svg', for example 'pages'.",
    ),
}).strict();
