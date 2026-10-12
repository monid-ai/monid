import { defineEndpoint } from "@shared/core";
import { zCompanyQueryParams } from "./schema/inputs.ts";

/**
 * GET /company — every measured signal for one company. Inherits the
 * provider's flat $0.002 PER_CALL; a 404 (unknown company) is not
 * charged.
 */
export default defineEndpoint({
    meta: {
        displayName: "Vela Breakout Company Growth Signals",
        summary: "Everything measured about one company's growth: AI " +
            "usage, downloads, installs, software adoption, web rank, " +
            "hiring and news, each against its peers.",
        description: "Look up one company by name or web domain and get " +
            "every growth signal Breakout measures for it, across all " +
            "groups at once: AI tokens its apps or models use, downloads " +
            "of its developer packages and agent tools, installs of its " +
            "editor extensions and add-ons, its adoption score on a " +
            "business-spend panel, its website's rank among all " +
            "websites, its open roles, and its points in the tech news. " +
            "Each signal carries growth as a ratio and in words (before, " +
            "now, unit, window), how it compares with its peers ('Faster " +
            "than 94% of editor extensions'), and the answer opens with " +
            "a one-line summary ('rising on 1 of 7 measures'), the " +
            "measurement date and a link to the company page. An unknown " +
            "company is a 404 and costs nothing; try its web domain. " +
            "Returns measured growth only — no funding, headcount, " +
            "founders or contact data. To discover companies rather than " +
            "look one up, use /rising-companies or /breakouts.",
        docsUrl: "https://breakout.vela.partners/agent",
        categories: ["company-enrichment", "market-trends"],
        notes: [
            "One company can carry several signals in the same group " +
            "(e.g. two websites or two careers pages); each is listed " +
            "with what it is in `about`.",
        ],
    },
    request: { method: "GET", path: "/company" },
    input: { schema: { queryParams: zCompanyQueryParams } },
});
