import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zJobSearchBody } from "./schema/inputs.ts";

/**
 * `POST /v1/jobs/search` — Spicrawl's job index.
 *
 * BILLING: flat 2 credits per call, regardless of how many postings return.
 * The estimate is that constant; the settle is the reported `credits_used`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Spicrawl Job Search",
        summary:
            "Search an index of open job postings from 13 job sources in " +
            "one call.",
        description: "Search Spicrawl's continuously updated index of open " +
            "job postings from Greenhouse, Lever, Ashby, Workable, " +
            "SmartRecruiters, Recruitee, Breezy, Pinpoint, Personio, Workday, " +
            "Y Combinator, Wellfound and Reddit job subreddits, in one query. " +
            "It reads the index and does not fetch company job boards, so " +
            "results come back in a single call. Filter by title (web-search " +
            "syntax), place, workplace (remote, hybrid, onsite), posting age " +
            "with `posted_within`, seniority, employment type, skills, " +
            "language, country, yearly salary floor, visa sponsorship, and " +
            "platform. Each call returns one page, newest first; pass " +
            "`next_cursor` back as `cursor` to read on. Set " +
            "`include_description` for the full posting text. Flat 2 credits " +
            "per call, however many postings come back.",
        docsUrl: "https://docs.spicrawl.com",
        categories: ["jobs"],
    },
    request: { method: "POST", path: "/jobs/search" },
    input: { schema: { body: zJobSearchBody } },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "job search",
        },
        estimate: () => ({ counts: { CREDIT: 2 } }),
        evidence: ({ data, utils }) => {
            const credits = utils.json.optionalNum(
                data.output,
                "$.credits_used",
            );
            return {
                counts: credits === undefined ? {} : { CREDIT: credits },
            };
        },
    },
});
