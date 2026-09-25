import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSearchBody } from "../../schema/filters.ts";

/** POST /search/people — structured search over professional profiles,
 *  charged per result returned. */
export default defineEndpoint({
    meta: {
        displayName: "Search People",
        summary: "Find professional profiles by employer, title, skills, " +
            "education, location and company funding.",
        description: "Structured search over professional profiles. " +
            "Combine conditions with and/or groups over these columns — " +
            "profile: first_name, last_name, profile_location, " +
            "profile_country (ISO-2 uppercase, GB not UK), " +
            "profile_industry, follower_count, keyword (headline full-text); " +
            "current job: current_company, current_title, " +
            "current_job_location, current_company_industry, " +
            "current_company_category, current_company_size (2-10, 11-50, " +
            "51-200, 201-500, 501-1000, 1001-5000, 5001-10000, 10001+), " +
            "current_company_id, current_employment_type, " +
            "years_in_current_position, years_at_current_company, " +
            "current_company_has_funding, current_company_funding_stage " +
            "(seed_round, series_a, series_b, ...), " +
            "current_company_investor; past jobs: past_company, past_title, " +
            "past_job_location, past_company_industry, past_company_size, " +
            "past_company_id, past_employment_type, years_at_past_company; " +
            "skill; school, degree, degree_level, field_of_study; language, " +
            "language_iso, language_proficiency; certification, " +
            "certification_authority; years_of_experience, num_total_jobs, " +
            "is_currently_employed. Titles are free-form, so match the part " +
            'that matters with `like` ("software engineer") rather than ' +
            "an exact title. Returns up to 1000 profiles per page (id, " +
            "name, headline, location, experience, education, skills) with " +
            "`total` for the full match count; paginate with offset. " +
            "Results carry no email or phone: pass a result's `id` to " +
            "/enrich/profile for contact data. To start from companies, " +
            "use /search/companies and filter here on current_company_id.",
        docsUrl: "https://docs.dataforb2b.ai/api-reference/search-people",
        categories: ["people-enrichment"],
        notes: [
            "enrich_live defaults to true (fresh data, 1.5 credits per " +
            "result); set it false for indexed data at 0.75 per result.",
        ],
    },
    request: { method: "POST", path: "/search/people" },
    input: {
        schema: {
            // `count` REQUIRED at the binding (design D25): it is the
            // estimate's whole basis. `enrich_live` carries the vendor's
            // verified default (true) so the estimate reads the real rate.
            body: zSearchBody.required({ count: true }).extend({
                enrich_live: zSearchBody.shape.enrich_live.unwrap()
                    .default(true),
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
