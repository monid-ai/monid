import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zScoreRepoQueryParams } from "./schema/inputs.ts";

/** GET /api/score — the README report for a public GitHub repository (free). */
export default defineEndpoint({
    meta: {
        displayName: "Score a Repository README",
        summary:
            "Score the README of a public GitHub repository out of 100, with a fix for every miss.",
        description: "Reads the repository's README at its latest commit " +
            "and returns a score out of 100, a letter grade, the detected " +
            "project type (CLI tool, library, app or backend API), and " +
            "every check grouped by topic: sections, first screen, " +
            "readability, quickstart, works from scratch, links, tagline " +
            "and website. A failed check carries the line to change and the " +
            "text to add. Deterministic: the same README always gets the " +
            "same score. Works on public repositories only; to score text " +
            "that is not on GitHub, use the paste endpoint.",
        docsUrl: "https://github.com/flisk-sh/readme-score#readme",
        categories: ["documentation"],
    },
    request: { method: "GET", path: "/api/score" },
    input: { schema: { queryParams: zScoreRepoQueryParams } },
    usage: { model: { kind: UsageModelKind.FREE } },
});
