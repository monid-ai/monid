import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zJobSearchQueryParams } from "./schema/inputs.ts";

/** GET /jobs/search — keyword, location and work-mode search over public jobs. */
export default defineEndpoint({
    meta: {
        displayName: "HireHouse Job Search",
        summary: "Search open jobs by keywords, location and work mode.",
        description: "Search active, publicly listed HireHouse jobs. Every " +
            "word in 'query' must match the role's title, company, location " +
            "or description. Returns job cards (id, title, company, " +
            "workMode, location, payRange, publishedAt, a short description " +
            "preview and applyUrl), the total, and a 'nextCursor' for the " +
            "next page. When nothing matches exactly, related roles are " +
            "returned with match 'related' and a per-job relatedReason " +
            "('similar', 'nearby' or 'latest') — present those as " +
            "alternatives, not matches. Use hirehouse#jobs/{id} for a " +
            "role's full description.",
        docsUrl: "https://hirehouse.xyz/developers#endpoints",
    },
    request: { method: "GET", path: "/jobs/search" },
    input: { schema: { queryParams: zJobSearchQueryParams } },
    // HireHouse charges nothing: FREE, no credit pool.
    usage: { model: { kind: UsageModelKind.FREE } },
});
