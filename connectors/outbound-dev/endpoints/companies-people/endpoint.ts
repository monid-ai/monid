import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCompanyPeopleBody } from "./schema/inputs.ts";

/**
 * `POST /companies/people` — the people at one company, narrowed by people
 * filters.
 *
 * SYNC and paged: outbound.dev resolves the company, then searches its
 * people. The opaque `pagination.nextCursor` passes through untouched, and
 * the caller sends it back with the same `company` and `filters`.
 *
 * BILLED PER ROW RETURNED, like the people search: $0.001 per person on the
 * page, so the evidence counts `data`. A company nothing matches answers
 * `200` with `status: "not_found"` and an empty `data`, which counts zero.
 */
export default defineEndpoint({
    meta: {
        displayName: "Find Decision Makers",
        summary:
            "Find decision makers and employees at a company: full names, titles and LinkedIn URLs, no masked previews.",
        description: "List the people who work at one company: an " +
            "account's decision makers in one call. Name the `company` by " +
            "website `domain`, `linkedinUrl` or `name`, and narrow by " +
            "department (`filters.job_title_role`) or seniority " +
            "(`filters.job_title_levels`, such as cxo, vp, director or " +
            "owner). Returns up to 25 people a page, each with a " +
            "full name, title, seniority and LinkedIn URL, with no masked " +
            "previews or reveal step, and a company nothing matches costs " +
            "nothing. The answer carries `status` (`found`, or `not_found` " +
            "when nothing matches the company), `company` (`name`, " +
            "`domain`, `linkedinUrl` and `logoUrl`), `data` (the people) " +
            "and `pagination.nextCursor`: send it back as `cursor` with the " +
            "same `company` and `filters` for the next page; it is absent " +
            "on the last page. People carry no email or phone: for those, " +
            "use `outbound-dev#people/enrich/email` (Find Work Email) and " +
            "`outbound-dev#people/enrich/phone` (Find Phone Number). To " +
            "search across companies, use `outbound-dev#people/search`.",
        docsUrl:
            "https://docs.outbound.dev/api-reference/companies/list-a-companys-people",
        categories: ["people-enrichment", "company-enrichment"],
        notes: [
            "A filter name or value the search does not take answers 422, " +
            "named in `param`, and charges nothing.",
            "A page can hold fewer people than `limit`; only a missing " +
            "`pagination.nextCursor` marks the end.",
        ],
    },
    request: { method: "POST", path: "/companies/people" },
    input: {
        schema: {
            body: zCompanyPeopleBody.extend({
                limit: zCompanyPeopleBody.shape.limit.unwrap().default(10),
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
