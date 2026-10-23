import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTechStackQueryParams } from "./schema/inputs.ts";

/** GET /enrichments/tech.json — one company's current tech stack. */
export default defineEndpoint({
    meta: {
        displayName: "Bloomberry Company Tech Stack",
        summary: "The software a company currently uses, by domain.",
        description: "Look up which software a company currently uses, " +
            "from its website domain. Returns a `vendors` array: each entry " +
            "has the vendor name, category and upper-level category, the " +
            "vendor's URL, the public record it was detected from " +
            "(context_url), and `usage_started_at`, the date Bloomberry first " +
            "saw the company using it (null when unknown). Covers 1,700+ " +
            "B2B tools, detected from DNS, certificate logs, subdomains and " +
            "website JavaScript rather than from the company's own site. " +
            "Filter to one category or upper-level category to keep the " +
            "list short. For who ELSE uses a given tool, use " +
            "/accounts/tech.json; for who just started or stopped using " +
            "one, use /signals/tech.json. One credit per enriched " +
            "company, whatever the vendor count; a domain with no " +
            "detected vendors costs nothing.",
        docsUrl:
            "https://docs.bloomberry.com/reference/get_enrichments-tech-json",
        categories: ["technographics", "company-enrichment"],
    },
    request: { method: "GET", path: "/enrichments/tech.json" },
    input: { schema: { queryParams: zTechStackQueryParams } },
    usage: {
        /** ONE CREDIT PER ENRICHED COMPANY, and only when the enrichment
         *  found something: the published rule is "1 credit per company
         *  enrichment", and the vendor (2026-10-20) confirms a domain
         *  that returns zero vendors draws nothing. So the quantity is
         *  the enriched-company count — 0 or 1 per call — a COUNTING
         *  rule owned by the fns (design D19), not a model shape. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "enriched companies",
            consumes: { credit: "default", amount: 1 },
        },
        /** The promise is the one enrichment the call asks for. */
        estimate: () => ({ counts: { "RESULT": 1 } }),
        /** Settle on the wire: one enriched company if `vendors` holds
         *  anything. The docs say list_mode=true returns a bare
         *  comma-separated string; observed 2026-10-20 it returns
         *  `{vendors: [names]}` — both shapes count the same way. */
        evidence: ({ data, utils }) => {
            const vendors = utils.json.optionalLen(data.output, "$.vendors");
            const found = vendors !== undefined
                ? vendors > 0
                : typeof data.output === "string" && data.output.length > 0;
            return { counts: { "RESULT": found ? 1 : 0 } };
        },
    },
});
