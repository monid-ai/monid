import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zScoreMarkdownBody } from "./schema/inputs.ts";

/** POST /api/score — the README report for pasted Markdown (free). */
export default defineEndpoint({
    meta: {
        displayName: "Score README Markdown",
        summary: "Score pasted README Markdown out of 100, with a fix for " +
            "every miss.",
        description: "Scores README text you send, with no GitHub access " +
            "needed: a draft, a private repository's README, or one not on " +
            "GitHub. Returns the same report as the repository endpoint: " +
            "score, grade, detected or chosen project type and every check " +
            "with the line to change and the text to add. Checks that need " +
            "the repository's files (relative links, CI, translations) are " +
            "reported as skipped, not failed. Optionally pass the product " +
            "website to compare its headline and description with the " +
            "README.",
        docsUrl: "https://github.com/flisk-sh/readme-score#readme",
        categories: ["documentation"],
    },
    // GET and POST share /api/score, so this endpoint states its own id (D22).
    endpoint: "/api/score/markdown",
    request: { method: "POST", path: "/api/score" },
    input: { schema: { body: zScoreMarkdownBody } },
    usage: { model: { kind: UsageModelKind.FREE } },
});
