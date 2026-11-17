import { defineProvider } from "@shared/core";
import { z } from "zod";

/**
 * README Score (readme.flisk.si) — scores a README out of 100 with a fix for
 * every miss. Two synchronous endpoints against `https://readme.flisk.si`:
 * a public GitHub repository by name, and pasted Markdown.
 *
 * README Score is free and needs no API key, so this provider declares an
 * EMPTY credentials shape and a pass-through `auth.inject` (the request leaves
 * as built). Every endpoint is FREE: nothing is metered and no credit system
 * is declared.
 */
export default defineProvider({
    name: "readme-score",
    meta: {
        displayName: "README Score",
        summary: "Score a README out of 100, with a fix for every miss.",
        description: "README Score — a deterministic README checker, no AI: " +
            "the same README always gets the same score. It checks the " +
            "sections found and missing (overview, installation, usage, " +
            "configuration, license and more, weighted for a CLI tool, a " +
            "library, a full-stack app or a backend API), the first " +
            "screen, readability, whether the quickstart works from " +
            "scratch, links and anchors, and whether the README and the " +
            "product website say the same thing. Every miss names the line " +
            "to change and the text to add.",
        homepageUrl: "https://readme.flisk.si",
        docsUrl: "https://github.com/flisk-sh/readme-score#readme",
        categories: ["documentation"],
        notes: [
            "Free and keyless: no credentials are needed, and nothing is " +
            "billed.",
            "A repository is read at one commit with three GitHub API " +
            "calls, so the server's own GitHub limit can run out; then the " +
            "error says when it resets, and pasting the README always works.",
            "Results are cached in memory for ten minutes. The limit is 120 " +
            "fresh GitHub reads and API calls per client per minute.",
        ],
    },
    auth: {
        // No secret exists. The pass-through keeps the request as built.
        inject: ({ data }) => data.request,
        credentials: z.object({}),
    },
    request: { baseUrl: "https://readme.flisk.si" },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
});
