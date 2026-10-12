import { defineEndpoint } from "@shared/core";
import { zIdeasQueryParams } from "./schema/inputs.ts";

/**
 * GET /ideas — AI research ideas by change in share of new papers.
 * Inherits the provider's flat $0.002 PER_CALL.
 */
export default defineEndpoint({
    meta: {
        displayName: "Vela Breakout AI Research Ideas",
        summary: "AI research ideas gaining or losing share of new " +
            "papers, with the companies publishing on each.",
        description: "Which AI research ideas are gaining (or losing) " +
            "ground: each idea's share of all new AI research papers in " +
            "the last 3 months against the 3 months before ('4.7% to " +
            "5.6%, +0.9 points'), a 1-5 score for how ready it is for " +
            "products, the companies publishing on it with their paper " +
            "counts, and a link to the idea's page. Shares, not paper " +
            "counts, so the overall growth of research does not inflate " +
            "every idea. Use it to spot technical directions before they " +
            "reach products. Does not return individual papers or " +
            "authors, and does not rank products — for product and " +
            "company growth use /breakouts or /rising-companies.",
        docsUrl: "https://breakout.vela.partners/agent",
        categories: ["market-trends"],
    },
    request: { method: "GET", path: "/ideas" },
    input: { schema: { queryParams: zIdeasQueryParams } },
});
