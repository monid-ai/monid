import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { DEFAULT_PER_PAGE } from "../../schema/common.ts";
import { zSearchPeopleBody } from "./schema/inputs.ts";

/** POST /v2/search/people: structured People Search, full profiles, cursor
 *  pagination, 1 credit per delivered profile. */
export default defineEndpoint({
    meta: {
        displayName: "Search People",
        summary: "Find people by title, function, seniority, employer, " +
            "industry, location, skills and more; full profiles back.",
        description: "Search the Reverse Contact people database with " +
            "structured filters and get full professional profiles back, " +
            "up to 100 per page. Filter on current or past job title, " +
            "function, sub-function and seniority; current or past " +
            "employer by name, id, page handle, industry or headcount; " +
            "cumulative experience in a function or seniority; total " +
            "experience; job changes in the last 30 to 120 days; skills, " +
            "spoken languages, location, keywords anywhere on the " +
            "profile, and profile flags such as open to work. Filters are " +
            "AND-combined and list values OR-combined. Built for " +
            "prospect list building, account mapping and sourcing. " +
            "`data.data` holds the profiles, `data.metadata.count` the " +
            "total and `data.metadata.nextCursor` the next page. Size a " +
            "query for free with `reversecontact#v2/search/people/count` " +
            "first; for a plain-language query, use " +
            "`reversecontact#v2/search/people/prompt`. 1 credit per " +
            "profile delivered; an empty page costs nothing.",
        docsUrl: "https://docs.reversecontact.com/endpoints/search-people",
        categories: ["people-enrichment"],
        notes: [
            "At least one filter is required (422 `NO_FILTER_PROVIDED`).",
            "`followersCount` used alone needs both bounds, " +
            "`excludeLanguages` needs another positive filter, and an " +
            "include list may not contradict its exclude twin (422 " +
            "`CONTRADICTORY_FILTERS`).",
            "Very broad queries (a common title or one industry alone) can " +
            "be slow; pair a title with a location or a company.",
            "Pass `nextCursor` back unchanged with the same filters; a " +
            "cursor with other filters is refused.",
            "Upstream checks that a full page (`perPage` credits) could be " +
            "paid before it runs; only delivered profiles are billed.",
        ],
    },
    request: { method: "POST", path: "/v2/search/people" },
    input: {
        schema: {
            // The vendor's documented page size, stated at the binding so
            // the estimate reads it (design D25).
            body: zSearchPeopleBody.extend({
                perPage: zSearchPeopleBody.shape.perPage.unwrap().default(
                    DEFAULT_PER_PAGE,
                ),
            }),
        },
    },
    timeouts: { requestMs: 40_000, runMs: 45_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "profiles delivered",
            description: "Reverse Contact credits as the receipt reports " +
                "them: 1 per profile delivered",
        },
        /** The ceiling: a full page. */
        estimate: ({ data }) => ({
            counts: { CREDIT: data.input.body.perPage },
        }),
    },
});
