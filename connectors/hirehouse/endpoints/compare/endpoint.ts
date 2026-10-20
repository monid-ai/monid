import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zJobCompareQueryParams } from "./schema/inputs.ts";

/** GET /jobs/compare — 2 to 5 public jobs side by side. */
export default defineEndpoint({
    meta: {
        displayName: "HireHouse Compare Jobs",
        summary: "Compare 2 to 5 open jobs side by side.",
        description: "Compare two to five HireHouse jobs by ID " +
            "(comma-separated 'ids'). Returns each job's public details, " +
            "full description and applyUrl, plus 'missing' — requested IDs " +
            "that are closed or not public. Fewer than two public jobs " +
            "answers 404 not_found.",
        docsUrl: "https://hirehouse.xyz/developers#endpoints",
    },
    request: { method: "GET", path: "/jobs/compare" },
    input: { schema: { queryParams: zJobCompareQueryParams } },
    usage: { model: { kind: UsageModelKind.FREE } },
});
