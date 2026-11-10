import { defineEndpoint } from "@shared/core";
import { zProviderPathParams } from "./schema/inputs.ts";

/** GET /providers/{slug} — free and open, no key. */
export default defineEndpoint({
    meta: {
        displayName: "Datacircle One provider",
        summary: "One provider's plans and ranks on every GTM API.",
        description:
            "Give one provider by its slug and its ranks on every GTM API it has plans for, with each plan's score and price per 1,000.",
        docsUrl: "https://api.datacircle.dev/v1/openapi.json",
        categories: ["api-benchmarks"],
    },
    request: { method: "GET", path: "/providers/{slug}" },
    input: { schema: { pathParams: zProviderPathParams } },
});
