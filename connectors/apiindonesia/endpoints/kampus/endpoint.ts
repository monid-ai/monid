import { defineEndpoint } from "@shared/core";
import { zKampusQueryParams } from "./schema/inputs.ts";

/**
 * GET /api/v1/kampus. Inherits the provider's flat 2-credit
 * PER_CALL (one successful request = Rp2); a non-2xx answer settles at
 * zero.
 */
export default defineEndpoint({
    meta: {
        displayName: "Indonesia University Directory",
        summary: "Search Indonesian universities, institutes and polytechnics.",
        description:
            "Search and list Indonesia's higher-education institutions from PDDikti: " +
            "universities, institutes, polytechnics, academies and colleges, each " +
            "with its type, group (PTN state, PTS private, PTA religious, PTK " +
            "official) and province and regency names. Filter by name or abbreviation " +
            "(`q`), province or regency code, type and group. Use it to verify that a " +
            "campus named on a CV or form exists, or to list the state universities " +
            "in a province. Paginated; read `meta.total_pages`.",
        docsUrl: "https://docs.apiindonesia.id/en/docs/#kampus",
        categories: ["government-data"],
    },
    request: { method: "GET", path: "/kampus" },
    input: { schema: { queryParams: zKampusQueryParams } },
});
