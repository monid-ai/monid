import { defineEndpoint } from "@shared/core";
import { zExploreVariablesQueryParams } from "./schema/inputs.ts";

/** GET /explore-variables — discover Census variables for a keyword. */
export default defineEndpoint({
    meta: {
        displayName: "censusdata.xyz Explore Variables",
        summary: "Discover which US Census variables exist for a topic " +
            "keyword.",
        description: "Search the US Census variable catalog (28,000+ " +
            "indicators) by topic keyword. Returns matching variables, " +
            "their descriptions, and ready-to-use natural-language queries, " +
            "so you can phrase a good /query without guessing. It does not " +
            "return census statistics itself — use /query for the data.",
        docsUrl: "https://censusdata.xyz/skill",
        categories: ["government-data"],
    },
    request: { method: "GET", path: "/explore-variables" },
    input: { schema: { queryParams: zExploreVariablesQueryParams } },
});
