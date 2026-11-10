import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zArbeitsagenturJobsScraperBody } from "./schema/inputs.ts";

/**
 * benthepythondev/arbeitsagentur-jobs-scraper — German Federal
 * Employment Agency job search.
 *
 * PURE DATA: the async machinery (lifecycle + fromError + the generic
 * usage.evidence, rows → the sole metered line) is inherited from the
 * apify provider; the actorId is baked into the start path.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search German Jobs (Arbeitsagentur)",
        summary: "Job vacancies from Germany's Federal Employment Agency, " +
            "by keyword and city, with full description and contacts.",
        description: "Searches the job board of Germany's Federal " +
            "Employment Agency (Bundesagentur für Arbeit, the largest job " +
            "board in Germany) for each keyword and location pair, with " +
            "radius, vacancy type (job, apprenticeship, internship, " +
            "self-employment), working-time filters (full-time, part-time, " +
            "shift, home office, mini job), posting age, and the option to " +
            "drop temporary-work agencies. One row per unique vacancy: " +
            "title, employer, locations, posting date, the agency's " +
            "reference number and link, and with includeDetails the full " +
            "description, working time, remote status and the public " +
            "contact the employer listed. Keywords may be German or English.",
        docsUrl:
            "https://apify.com/benthepythondev/arbeitsagentur-jobs-scraper",
        categories: ["jobs"],
    },
    endpoint: "/benthepythondev/arbeitsagentur-jobs-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/benthepythondev~arbeitsagentur-jobs-scraper/runs",
    },
    input: {
        schema: {
            // the search pairs and the per-pair cap are the limiting
            // knobs — required at the binding so the estimate is exact
            // arithmetic (the actor would otherwise search its sample)
            body: zArbeitsagenturJobsScraperBody.required({
                keywords: true,
                locations: true,
                maxResultsPerSearch: true,
            }),
        },
    },
    usage: {
        /** The WHOLE published card (D29). Pins are the scheduled prices
         *  effective 2026-11-09 (pricingInfos, read 2026-10-26); the row
         *  billing today is $0.00096. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                actor_start: {
                    kind: UsageModelKind.PER_CALL,
                    label: "actor start",
                    // vendor charge event: "apify-actor-start", one per
                    // started GB; the actor runs at 512 MB → one event
                    consumes: { credit: "default", amount: 0.00004 },
                },
                default_dataset_item: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "jobs",
                    // vendor charge event: "apify-default-dataset-item"
                    consumes: { credit: "default", amount: 0.0012 },
                },
            },
        },
        /** keyword × location pairs (the actor reads at most 20 of each)
         *  × the per-pair cap; duplicates across pairs are saved once, so
         *  this is an upper bound. */
        estimate: ({ data }) => {
            const body = data.input.body;
            const keywords = Math.min(body.keywords.length, 20);
            const locations = Math.min(body.locations.length, 20);
            return {
                counts: {
                    default_dataset_item: keywords * locations *
                        body.maxResultsPerSearch,
                },
            };
        },
    },
});
