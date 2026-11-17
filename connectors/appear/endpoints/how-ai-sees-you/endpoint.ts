import { defineEndpoint } from "@shared/core";
import { scanBody } from "./schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/how-ai-sees-you",
    meta: {
        displayName: "Appear AI Readiness Scan",
        summary:
            "Score a public website and see which facts AI crawlers can read.",
        description:
            "Check a site's readiness for AI crawlers. The report scores the " +
            "site, compares the first HTML response with rendered content on sampled " +
            "pages, and returns crawler checks, evidence, and recommended fixes. " +
            "Use this to diagnose missing content or check improvements after a site change.",
        docsUrl:
            "https://github.com/monid-ai/monid/blob/main/connectors/appear/README.md",
        categories: ["geo", "seo"],
        notes: [
            "Scans are subject to hourly limits per IP and daily limits per domain. " +
            "A rate-limited scan returns HTTP 429.",
        ],
    },
    request: {
        method: "POST",
        path: "/api/how-ai-sees-you",
        headers: { accept: "application/json" },
    },
    input: { schema: { body: scanBody } },
    output: {
        // Screenshots are embedded for the interactive report. Keep the text evidence for agents.
        fromResponse: ({ data, utils }) =>
            utils.json.omit(data.output, ["screenshotDataUrl"]),
    },
    timeouts: { requestMs: 125_000, runMs: 130_000 },
});
