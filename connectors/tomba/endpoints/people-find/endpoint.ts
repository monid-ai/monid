import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPeopleFindQueryParams } from "./schema/inputs.ts";

/** GET /people/find — a person profile from an email (Clearbit format). */
export default defineEndpoint({
    meta: {
        displayName: "Enrich Person",
        summary:
            "Get a person's profile from their email address, in Clearbit's Person API format.",
        description: "Look up the person behind an email address and " +
            "return a Clearbit-compatible Person profile: name, location " +
            "and geo, employment (company, domain, title, role, " +
            "seniority), LinkedIn / Twitter / GitHub / Facebook handles, " +
            "the verification status, and index dates. Fields Tomba " +
            "doesn't fill are always null. Suited as a drop-in for " +
            "Clearbit person enrichment. For Tomba's own format, use " +
            "/enrich; for the person and their company in one call, " +
            "/combined/find.",
        docsUrl: "https://docs.tomba.io/api/enrichment#person-api",
        categories: ["people-enrichment"],
        notes: [
            "Charged 1 search credit only when a person is returned.",
            "No match is a 200 carrying an `errors` object instead of " +
            "`data` — type `not_found` (no data) or `params_invalid` " +
            "(webmail / disposable address); it costs nothing.",
        ],
    },
    request: { method: "GET", path: "/people/find" },
    input: {
        schema: {
            queryParams: zPeopleFindQueryParams.required({ email: true }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "people found",
            description: "person profiles returned (a miss counts zero)",
            consumes: { credit: "search", amount: 1 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** Found = a `data` object (a miss carries `errors` instead). */
        evidence: ({ data, utils }) => {
            const person = utils.json.optionalGet(data.output, "$.data");
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
