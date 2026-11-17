import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPfInfoListingBody } from "./schema/inputs.ts";

/**
 * Mindcase `pf-info/listing`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "EPFO Establishment Search",
        summary: "Find an Indian establishment in the EPFO register by name. " +
            "Returns every match the register gives (up to 100 per name) " +
            "with the establishment id, registered...",
        description:
            "Find an Indian establishment in the EPFO register by name. " +
            "Returns every match the register gives (up to 100 per name) " +
            "with the establishment id, registered name, address and EPFO " +
            "office: the lookup step before pulling a full record by id. " +
            "Returns one row per establishment with establishmentId, " +
            "establishmentName, address, office, scrapedAt. One or more " +
            "establishment or company names. For the full EPFO record of " +
            "a match use mindcase#pf-info/establishment. $0.05 per " +
            "establishment; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/pf-info/listing",
        categories: ["government-data", "company-enrichment"],
    },
    endpoint: "/pf-info/listing",
    request: { method: "POST", path: "/v1/data/pf-info/listing/run" },
    input: {
        schema: {
            body: zPfInfoListingBody.extend({
                maxResults: zPfInfoListingBody.shape.maxResults.unwrap().min(1)
                    .describe(
                        "Stop after this many matches have been returned. Each match costs a row, so this caps the bill as well as the output. But the register's order is regional, not best-match, so a low cap is an arbitrary slice rather than the closest names. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.05 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
