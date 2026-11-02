import { defineEndpoint } from "@shared/core";
import { zMerekSearchQueryParams } from "./schema/inputs.ts";

/**
 * GET /api/v1/merek/search. Inherits the provider's flat 2-credit
 * PER_CALL (one successful request = Rp2); a non-2xx answer settles at
 * zero.
 */
export default defineEndpoint({
    meta: {
        displayName: "Indonesia Trademark Search",
        summary: "Search registered trademarks in Indonesia's DJKI database.",
        description:
            "Search about 900,000 Indonesian trademark records (DJKI) by mark name, " +
            "or by owner with `in=owner`, filtered by owner and NICE class. Each " +
            "result has the application number, mark name, class, owner, consultant " +
            "and registration date. Use it to check whether a brand name is already " +
            "registered in Indonesia before launching or filing, or to list a " +
            "company's marks. Paginated with `page` and `limit`.",
        docsUrl: "https://docs.apiindonesia.id/en/docs/#merek",
        categories: ["government-data", "legal-research"],
    },
    request: { method: "GET", path: "/merek/search" },
    input: { schema: { queryParams: zMerekSearchQueryParams } },
});
