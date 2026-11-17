import { defineEndpoint } from "@shared/core";
import { zPlansQueryParams } from "./schema/inputs.ts";

/** GET /plans — free and open, no key. */
export default defineEndpoint({
    meta: {
        displayName: "Datacircle Search the plans",
        summary: "Search the plans of every GTM API by API, provider or price.",
        description:
            "Search every plan on the sheet. Filter by API (its name or slug), by words in the provider's or plan's name, sort by score, provider or price per 1,000, and page with limit and offset.",
        docsUrl: "https://api.datacircle.dev/v1/openapi.json",
        categories: ["api-benchmarks"],
    },
    request: { method: "GET", path: "/plans" },
    input: { schema: { queryParams: zPlansQueryParams } },
});
