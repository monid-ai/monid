import { defineEndpoint } from "@shared/core";
import { zCuacaSearchQueryParams } from "./schema/inputs.ts";

/**
 * GET /api/v1/cuaca/search. Inherits the provider's flat 2-credit
 * PER_CALL (one successful request = Rp2); a non-2xx answer settles at
 * zero.
 */
export default defineEndpoint({
    meta: {
        displayName: "Indonesia Weather Location Search",
        summary:
            "Find the village code (adm4) for an Indonesian weather forecast.",
        description:
            "Search villages and cities that have a BMKG weather forecast by name and " +
            "get their `adm4` village codes. This is step one for a forecast: pass an " +
            "`adm4` from here to `apiindonesia#cuaca`. Matching is by place name " +
            "only.",
        docsUrl: "https://docs.apiindonesia.id/en/docs/#cuaca",
        categories: ["government-data", "maps"],
    },
    request: { method: "GET", path: "/cuaca/search" },
    input: { schema: { queryParams: zCuacaSearchQueryParams } },
});
