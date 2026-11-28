import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSearchPeopleBody } from "./schema/inputs.ts";

/**
 * `POST /people/search` — find people by a sentence or by filters.
 *
 * SYNC and paged: the opaque `pagination.nextCursor` passes through
 * untouched, and the caller sends it back with the returned `filters` to
 * this same endpoint (firecrawl's posture: one bounded page per run, honest
 * paging).
 *
 * BILLED PER ROW RETURNED. outbound.dev charges $0.001 per person on the
 * page, so the evidence counts `data`; the estimate is the page size, the
 * most a page can return.
 */
export default defineEndpoint({
    meta: {
        displayName: "Find B2B Leads",
        summary:
            "Find B2B leads by title, seniority, company, industry or location, from filters or a plain-English description.",
        description: "Find B2B leads by title, seniority, department, " +
            "company, industry or location. Send a plain-English `query`, " +
            'such as "operations directors at logistics companies in ' +
            'Portugal", or `filters`. Each person has a full name, title, ' +
            "seniority, department, company and LinkedIn URL, with no " +
            "masked previews or reveal step, up to 100 a page, and an empty " +
            "page costs nothing. The answer carries `data` (the people), " +
            "`filters` (the filters the search ran with) and " +
            "`pagination.nextCursor`: send it back as `cursor` with those " +
            "`filters` for the next page; it is absent on the last page. " +
            "`pagination.total` estimates everyone matching, on the first " +
            "page of a search on people filters alone. A `query` also answers `unresolvedCriteria` (the parts no " +
            "filter could express) and `closestCompanyMatches` (each company " +
            "it chose between same-named companies for). People carry no " +
            "email or phone: for those, use " +
            "`outbound-dev#people/enrich/email` (Find Work Email) and " +
            "`outbound-dev#people/enrich/phone` (Find Phone Number). Size a " +
            "search for free first with `outbound-dev#people/count`, and " +
            "for the people at one named company use " +
            "`outbound-dev#companies/people`.",
        docsUrl: "https://docs.outbound.dev/api-reference/people/search-people",
        categories: ["people-enrichment"],
        notes: [
            "Send at most one of `query` and `filters`; a `linkedinUrl` " +
            "can stand on its own or narrow either. Both together, or none " +
            "of the three, answers 422 `validation_failed` and charges " +
            "nothing.",
            "Page with the returned `filters`, not the `query`: a repeated " +
            "`query` is turned into filters again.",
            "A page can hold fewer people than `limit`; only a missing " +
            "`pagination.nextCursor` marks the end.",
        ],
    },
    request: { method: "POST", path: "/people/search" },
    input: {
        schema: {
            body: zSearchPeopleBody.extend({
                limit: zSearchPeopleBody.shape.limit.unwrap().default(10),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.001 },
            label: "person",
            description: "a person returned on the page",
        },
        estimate: ({ data }) => ({
            counts: { RESULT: data.input.body.limit },
        }),
        evidence: ({ data, utils }) => ({
            counts: { RESULT: utils.json.len(data.output, "$.data") },
        }),
    },
});
