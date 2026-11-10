import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSearchPeopleBody } from "./schema/inputs.ts";

/**
 * `POST /prospects/search` — find people by a sentence or by filters.
 *
 * SYNC and paged: the opaque `scrollToken` passes through untouched, and the
 * caller sends it back with the returned `filters` to this same endpoint
 * (firecrawl's posture: one bounded page per run, honest paging).
 *
 * BILLED PER ROW RETURNED. Fuse debits 1 credit per profile returned and the
 * answer carries no receipt, so the evidence counts `profiles`; the estimate
 * is the page size, the most a page can return.
 *
 * Every row carries four fields about the Fuse workspace that holds the key
 * (`savedProfile`, `savedBy`, `linkedinConnectedAccountIds`,
 * `linkedinInvitationSentAccountIds`). They never describe the caller, so
 * `fromResponse` drops them.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search People",
        summary:
            "Find people by a plain-English description or by job, company and location filters.",
        description: "Find people by a plain-English sentence or by " +
            "filters (job title, seniority, department, employer, industry, " +
            "location, company size): name, title, employer and LinkedIn URL " +
            'for each match. Send `query`, e.g. "VPs of sales at fintech ' +
            'companies in New York", or `filters` in the vocabulary ' +
            "`fuse#prospects/filter-options` lists, never both; " +
            "`linkedinUrl` looks up one person. A `query` is turned into " +
            "filters: criteria it could not map come back as " +
            "`unresolvedCriteria`, and each company it chose between " +
            "same-named companies for comes back in `closestCompanyMatches` " +
            "as `{requestedName, name, domain}`. The answer echoes the " +
            "resolved `filters`, a `total` estimate (null on later pages and " +
            "on searches with employer filters) and a `scrollToken`: send it " +
            "back with the returned `filters` for the next page; it is null " +
            "on the last page. Each row carries `linkedin_url`, names, the " +
            "current job (title, seniority, department, employer name, " +
            "domain and industry), a lower-case location, summary, job " +
            "history and a picture link. Rows carry no email or phone: " +
            "find those with `fuse#data/people/email` and " +
            "`fuse#data/people/phone`, or for up to 100 people at once with " +
            "`fuse#data/people/enrich-jobs`. Size a search for free first " +
            "with `fuse#data/people/count`. Charged per person returned, " +
            "never per person matched.",
        categories: ["people-enrichment"],
        notes: [
            "Send `filters` or `query`, never both (422 VALIDATION_FAILED). " +
            "With `filters`, at least one non-empty filter value, a " +
            "`linkedinUrl` or a `scrollToken` is required.",
            "Page with the returned `filters`, not the `query`: resending a " +
            "`query` converts it again, which can build a different search " +
            "that answers 422 SEARCH_CHANGED.",
            "A page can hold fewer rows than `size`; only a null " +
            "`scrollToken` marks the end.",
        ],
    },
    request: { method: "POST", path: "/prospects/search" },
    input: {
        schema: {
            body: zSearchPeopleBody.extend({
                size: zSearchPeopleBody.shape.size.unwrap().default(10),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 1 },
            label: "profile",
            description: "a profile returned on the page",
        },
        estimate: ({ data }) => ({ counts: { RESULT: data.input.body.size } }),
        evidence: ({ data, utils }) => ({
            counts: { RESULT: utils.json.len(data.output, "$.profiles") },
        }),
    },
    output: {
        fromResponse: ({ data, utils }) =>
            utils.json.omit(data.output, [
                "savedProfile",
                "savedBy",
                "linkedinConnectedAccountIds",
                "linkedinInvitationSentAccountIds",
            ]),
    },
});
