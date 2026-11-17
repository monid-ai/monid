import { defineEndpoint } from "@shared/core";
import { zBestPathParams, zBestQueryParams } from "./schema/inputs.ts";

/** GET /apis/{slug}/best — free and open, no key. */
export default defineEndpoint({
    meta: {
        displayName: "Datacircle Best for an API",
        summary: "Who is best for one GTM API, best first.",
        description:
            "Give the best plans for one GTM API by its slug from the list endpoint, best first as on the sheet at datacircle.dev, up to 50 with the limit. Use the plans endpoint to search by provider or price.",
        docsUrl: "https://api.datacircle.dev/v1/openapi.json",
        categories: ["api-benchmarks"],
    },
    request: { method: "GET", path: "/apis/{slug}/best" },
    input: {
        schema: { pathParams: zBestPathParams, queryParams: zBestQueryParams },
    },
});
