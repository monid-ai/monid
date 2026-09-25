import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSearchBody } from "../../schema/filters.ts";

/** POST /search/companies — structured company search, charged per result
 *  returned. */
export default defineEndpoint({
    meta: {
        displayName: "Search Companies",
        summary: "Find companies by industry, size, headcount growth, " +
            "location and funding.",
        description: "Structured search over companies. Combine " +
            "conditions with and/or groups over these columns — basic: " +
            "name, tagline, description, domain, universal_name, keyword " +
            "(full-text over name, tagline and description), industry " +
            '(lowercase, e.g. "software development"); size: ' +
            "employee_count (a number, or a range 1-10, 11-50, 51-200, " +
            "201-500, 501-1000, 1001-5000, 5001-10000, 10001+); " +
            "headquarters: country_iso_code (ISO-2), city, region; offices: " +
            "office_country, office_city, office_region; growth: " +
            "employee_growth_1m, employee_growth_6m, employee_growth_12m " +
            "(percent), recent_hires_count; metadata: founded_year, " +
            "company_type (PRIVATELY_HELD, PUBLIC_COMPANY, NON_PROFIT, ...), " +
            "follower_count, page_verified, category (lowercase); funding: " +
            "last_funding_amount_usd, last_funding_date, " +
            "funding_stage_normalized (seed_round, series_a, ...), " +
            "has_funding. Returns up to 1000 companies per page with " +
            "domain, website, headquarters, office locations, headcount, " +
            "growth and last funding round, plus `total` for the full " +
            "match count; paginate with offset. To find the people who " +
            "work there, pass the result ids to /search/people as a " +
            "current_company_id `in` filter.",
        docsUrl: "https://docs.dataforb2b.ai/api-reference/search-company",
        categories: ["company-enrichment"],
        notes: [
            "enrich_live defaults to false (indexed data, 0.75 credits per " +
            "result); set it true for data refreshed at query time at 1.5 " +
            "per result.",
        ],
    },
    request: { method: "POST", path: "/search/companies" },
    input: {
        schema: {
            // `count` REQUIRED at the binding (design D25). `enrich_live`
            // carries the vendor's verified default for THIS route (false —
            // unlike /search/people).
            body: zSearchBody.required({ count: true }).extend({
                enrich_live: zSearchBody.shape.enrich_live.unwrap()
                    .default(false),
            }),
        },
    },
    usage: {
        /** The published card (docs, 2026-09-23): one line per mode, per
         *  result returned. The `credits_used` receipt is the claim that
         *  bills (provider consolidate). */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                live_result: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 1.5 },
                    label: "live results",
                    description: "results refreshed at query time " +
                        "(enrich_live true)",
                },
                indexed_result: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.75 },
                    label: "indexed results",
                    description: "results served from the index " +
                        "(enrich_live false)",
                },
            },
        },
        /** Ceiling: the requested count, on the requested mode's line. */
        estimate: ({ data }) => ({
            counts: data.input.body.enrich_live
                ? { "live_result": data.input.body.count }
                : { "indexed_result": data.input.body.count },
        }),
        /** The results actually returned, on the requested mode's line. */
        evidence: ({ data, utils }) => {
            const results = utils.json.optionalLen(data.output, "$.results") ??
                0;
            return {
                counts: data.input.body.enrich_live
                    ? { "live_result": results }
                    : { "indexed_result": results },
            };
        },
    },
});
