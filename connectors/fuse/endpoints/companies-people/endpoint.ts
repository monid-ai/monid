import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCompanyPeopleBody } from "./schema/inputs.ts";

/**
 * `POST /data/companies/people` — the people at one company, narrowed by
 * people search filters.
 *
 * SYNC and paged: Fuse resolves the company, then searches its domain. The
 * opaque `scrollToken` passes through untouched, and the caller sends it
 * back with the same `company` and `filters` to this same endpoint (one
 * bounded page per run, as `fuse#prospects/search` pages).
 *
 * THE RECEIPT SETTLES IT, unlike the two searches: the answer carries
 * `creditsCharged`, the plan price times the people returned, so this is a
 * receipt-settled `PER_UNIT` in `CREDIT` units like the lookups. The
 * estimate is a full page at that price. Rows carry no workspace fields:
 * Fuse answers profiles only.
 */
export default defineEndpoint({
    meta: {
        displayName: "Find People at a Company",
        summary:
            "List the people who work at a company, narrowed by seniority, department or title.",
        description: "List the people who work at one company, narrowed by " +
            "people search filters such as seniority (`job_title_levels`) or " +
            "department (`job_title_role`): an account's decision makers in " +
            "one call. Charged per person returned. Send `company` as " +
            "`fuse#data/companies/resolve` takes it (`name`, `domain` or " +
            "`linkedinUrl`), optional `filters` in the vocabulary " +
            "`fuse#prospects/filter-options` lists (the company filters are " +
            "not taken: `company` names the company) and `size`, 1 to 25 " +
            "people per page. The answer carries `status` (`found`, or " +
            "`not_found` when nothing matches the company: no people, " +
            "nothing charged), `company` (`name`, `domain`, `linkedinUrl` and " +
            "`logoUrl`), `people`, a `total` estimate of everyone matching " +
            "(first page only) and a `scrollToken`: send it back with the " +
            "same `company` and `filters` for the next page; it is null on " +
            "the last page. Each person carries `linkedinMemberId`, " +
            "`linkedin_url`, names, the current job (title, seniority, " +
            "department, employer name, domain and industry), a lower-case " +
            "location, summary, job history and a picture link, but no email " +
            "or phone: find those with `fuse#data/people/email` and " +
            "`fuse#data/people/phone`, or for up to 100 people at once with " +
            "`fuse#data/people/enrich-jobs`.",
        categories: ["people-enrichment"],
        notes: [
            "A filter value Fuse cannot take answers 422 " +
            "SEARCH_FILTERS_INVALID, and a place, email or phone a filter " +
            "names that matches nothing 422 FILTER_VALUE_UNRESOLVED; both name " +
            "the filter in `param` and charge nothing.",
            "A page can hold fewer people than `size`; only a null " +
            "`scrollToken` marks the end. A token whose search has changed " +
            "answers 422 SEARCH_CHANGED: start again without it.",
        ],
    },
    request: { method: "POST", path: "/data/companies/people" },
    input: {
        schema: {
            body: zCompanyPeopleBody.extend({
                size: zCompanyPeopleBody.shape.size.unwrap().default(10),
            }),
        },
    },
    usage: {
        /** Metered in Fuse's own credits; the provider's evidence reads the
         *  receipt, so a company nothing matches settles its zero. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "person returned",
            description: "what the page drew, as Fuse's own receipt says",
        },
        /** A full page, at the plan's `company_people` price of 1 per
         *  person. */
        estimate: ({ data }) => ({ counts: { CREDIT: data.input.body.size } }),
    },
});
