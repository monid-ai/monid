import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zEmailSourcesQueryParams } from "./schema/inputs.ts";

/** GET /email-sources — the public pages an address was found on. */
export default defineEndpoint({
    meta: {
        displayName: "Get Email Sources",
        summary:
            "List the public web pages where an email address was found, with first and last seen dates.",
        description: "Return the public web pages where Tomba found an " +
            "email address — each with its URL, website, the date it was " +
            "extracted, the date it was last seen, and whether it is still " +
            "on the page. Suited for proving where a contact came from " +
            "(GDPR provenance) and judging how current an address is.",
        docsUrl: "https://docs.tomba.io/api/email#email-sources",
        categories: ["people-enrichment"],
        notes: [
            "Charged 1 sources credit only when sources are found; no " +
            "sources answers 201 with an empty data array, free. When the " +
            "sources balance is used up the endpoint answers 429.",
        ],
    },
    request: { method: "GET", path: "/email-sources" },
    input: {
        schema: {
            queryParams: zEmailSourcesQueryParams.required({ email: true }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "source lookups",
            description: "lookups that found at least one source",
            consumes: { credit: "sources", amount: 1 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** Charged when `data[]` is non-empty (a miss answers 201 with
         *  an empty array). */
        evidence: ({ data, utils }) => {
            const sources = utils.json.optionalGet(data.output, "$.data");
            return {
                counts: {
                    RESULT: Array.isArray(sources) && sources.length > 0
                        ? 1
                        : 0,
                },
            };
        },
    },
});
