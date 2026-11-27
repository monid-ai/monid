import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zMatchCompanyListBody } from "./schema/inputs.ts";

// Weekly Project monitoring (`watch`, `project_id`, `project_name`) mutates
// shared workspace state and bills a recurring monthly fee, so it is omitted
// at the binding; this endpoint exposes pure stateless $0.00 entity matching.
const zStatelessMatchBody = zMatchCompanyListBody.omit({
    watch: true,
    project_id: true,
    project_name: true,
});

/** POST /api/v1/companies/match: free entity resolution for company lists. */
export default defineEndpoint({
    meta: {
        displayName: "Dealport Match Company List",
        summary:
            "Match up to 250 company names or domains against 28M+ US businesses for $0.00.",
        description:
            "Resolve 1 to 250 external company rows (`items` or raw `csv`) " +
            "against Dealport's 28M+ US private companies via indexed domain " +
            "lookup and fuzzy legal-name plus state resolution at $0.00. " +
            "Returns matched Dealport company UUIDs, match confidence, and " +
            "cached human owner names so callers can pass matched UUIDs into " +
            "Record reads or owner contact lookups.",
        docsUrl: "https://dealport.com/docs",
        categories: ["company-enrichment"],
        notes: [
            "Accepts up to 250 rows per call via `items` or `csv`.",
        ],
    },
    request: { method: "POST", path: "/api/v1/companies/match" },
    input: {
        schema: {
            body: z.union([
                zStatelessMatchBody.required({ items: true }),
                zStatelessMatchBody.required({ csv: true }),
            ]).describe(
                "Provide at least one of `items` (1 to 250 structured company rows) or `csv` (CSV text with header row).",
            ),
        },
    },
    usage: {
        model: { kind: UsageModelKind.FREE },
    },
});
