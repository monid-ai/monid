import { defineEndpoint } from "@shared/core";

/** GET /apis — free and open, no key. */
export default defineEndpoint({
    meta: {
        displayName: "Datacircle List the APIs",
        summary: "List every GTM API on the sheet with its best plan.",
        description:
            "List every GTM API on the Datacircle sheet: its name and slug, how many plans and providers it has, its pages on datacircle.dev, and the best plan with its score and price per 1,000. Use the slug with the best endpoint to see who is best for one API.",
        docsUrl: "https://api.datacircle.dev/v1/openapi.json",
        categories: ["api-benchmarks"],
    },
    request: { method: "GET", path: "/apis" },
});
