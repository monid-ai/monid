import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCombinedFindQueryParams } from "./schema/inputs.ts";

/** GET /combined/find — person + company from an email (Clearbit format). */
export default defineEndpoint({
    meta: {
        displayName: "Enrich Person and Company",
        summary:
            "Get the person behind an email and their company in one call, in Clearbit's format.",
        description: "Look up the person behind an email address and the " +
            "company behind its domain in one call: data.person carries " +
            "the Clearbit-compatible Person fields (name, geo, employment, " +
            "social handles, verification) and data.company the Company " +
            "fields (description, location, industry codes, size, revenue, " +
            "technologies). When Tomba has no record of the domain, every " +
            "company field is null. Suited for full lead enrichment from a " +
            "single sign-up email.",
        docsUrl: "https://docs.tomba.io/api/enrichment#combined-api",
        categories: ["people-enrichment", "company-enrichment"],
        notes: [
            "Charged 2 search credits only when a person is returned.",
            "No match for the person is a 200 carrying an `errors` object " +
            "instead of `data` — type `not_found` or `params_invalid` " +
            "(webmail / disposable address); it costs nothing.",
        ],
    },
    request: { method: "GET", path: "/combined/find" },
    input: {
        schema: {
            queryParams: zCombinedFindQueryParams.required({ email: true }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "people found",
            description: "person + company profiles returned (a miss " +
                "counts zero)",
            consumes: { credit: "search", amount: 2 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** Found = a `data.person` object (a miss carries `errors`). */
        evidence: ({ data, utils }) => {
            const person = utils.json.optionalGet(data.output, "$.data.person");
            return {
                counts: {
                    RESULT: person !== null && typeof person === "object" &&
                            !Array.isArray(person)
                        ? 1
                        : 0,
                },
            };
        },
    },
});
