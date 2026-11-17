import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zUpworkJobsBody } from "./schema/inputs.ts";

/** `POST /upwork/jobs`: flat 1 credit per call (the vendor's controller
 *  charges one constant, with or without `fetchDetails`) ⇒ leaf PER_CALL. */
export default defineEndpoint({
    meta: {
        displayName: "Upwork Jobs",
        summary: "Search public Upwork freelance jobs by keyword, filters, " +
            "or a saved search URL.",
        description: "Search public Upwork freelance job listings and get " +
            "structured jobs back: id, title, canonical URL, posted time, " +
            "description snippet, location eligibility, contract (hourly " +
            "rate range or fixed price, experience level, duration, " +
            "weekly hours), and skills, plus the source's result " +
            "estimate and whether `maxItems` cut the list. Pick one " +
            "search mode: `keyword` (simple), the Advanced Search text " +
            "fields (`allWords`, `anyWords`, `excludedWords`, " +
            "`exactPhrase`, `titleWords`), filters alone (contract type, " +
            "hourly rate, fixed price, experience level, skills, " +
            "categories, client history, client location and timezone, " +
            "project length, weekly hours, contract-to-hire), or a saved " +
            "Upwork search `searchUrl` (then only `maxItems` and " +
            "`fetchDetails` may accompany it). A plain search returns " +
            "only the snippet, with the `activity` and `client` objects " +
            "empty. `fetchDetails` returns each job in the " +
            "`scraper#upwork/job-detail` shape, with the full " +
            "description, proposal activity, and client profile, and " +
            "caps `maxItems` at 10; a job whose detail page fails comes " +
            "back with its search data and `meta.detailStatus` " +
            "`failed` or `unavailable`, and the call still bills. " +
            "Public listings only: it does not log in, apply, or read " +
            "freelancer profiles. For traditional job boards use " +
            "`scraper#indeed/jobs`, `scraper#linkedin/jobs`, or " +
            "`scraper#glassdoor/jobs`.",
        docsUrl: "https://scraper.run/docs/upwork/jobs",
        categories: ["jobs"],
        notes: [
            "1 Scraper credit per call, whatever `maxItems` or " +
            "`fetchDetails` is.",
            "Pick exactly one search mode: `keyword`; the Advanced Search" +
            " fields (`allWords`, `anyWords`, `excludedWords`, " +
            "`exactPhrase`, `titleWords`; not with `keyword`); filters " +
            "alone; or `searchUrl` alone. A mixed request fails with 400 " +
            "and no credits. With `searchUrl`, only `maxItems` and " +
            "`fetchDetails` may also be given.",
            "A built search needs `keyword` or one filter that is not a " +
            "default. `sort` alone, a page size of 10 alone, and " +
            "`contractToHire` false alone do not count.",
            "`fetchDetails: true` needs `maxItems` of 10 or less.",
            "`hourlyRateMax` must be greater than `hourlyRateMin`, and " +
            "`fixedPriceMax` greater than `fixedPriceMin`, when both are " +
            "given.",
            "`projectLengths` and `hoursPerWeek` apply only to hourly " +
            "jobs. They are rejected when the filters select only fixed-" +
            "price jobs.",
        ],
    },
    request: { method: "POST", path: "/upwork/jobs" },
    input: { schema: { body: zUpworkJobsBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "job search calls",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
