import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zIndeedJobsBody } from "./schema/inputs.ts";

/** `POST /indeed/jobs`: flat 1 credit per call ⇒ leaf PER_CALL. */
export default defineEndpoint({
    meta: {
        displayName: "Indeed Jobs",
        summary: "Search Indeed job listings, or look up specific jobs by " +
            "key, across 62 countries.",
        description: "Search Indeed job listings by keyword and location and " +
            "get structured jobs back: title, employer, salary (text, min, " +
            "max, currency, period), location, posting dates, work " +
            "arrangement (remote, hybrid, schedule), the Indeed and " +
            "external apply links, and the description. Filter by " +
            "country, radius, recency (`fromDays`), employment type, and " +
            "remote or hybrid, and sort by relevance or date. Pass " +
            "`jobKeys` instead to fetch known jobs by their Indeed key; " +
            "that overrides the search. `fields` trims or widens each " +
            "job. For employer ratings, size, and headquarters use " +
            "`scraper#indeed/companies`; for the same role on other " +
            "boards use `scraper#linkedin/jobs` or `scraper#glassdoor/jobs`.",
        docsUrl: "https://scraper.run/docs/indeed/jobs",
        categories: ["jobs"],
        notes: ["1 Scraper credit per call, whatever `maxItems` is."],
    },
    request: { method: "POST", path: "/indeed/jobs" },
    input: { schema: { body: zIndeedJobsBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "job search calls",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
