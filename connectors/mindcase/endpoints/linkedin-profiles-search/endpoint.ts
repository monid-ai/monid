import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinProfilesBody } from "../../schema/linkedin-profiles.ts";

/**
 * Mindcase `linkedin/profiles` (search). Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "LinkedIn People Search",
        summary: "Search LinkedIn members by keyword plus structured filters " +
            "(location, seniority, function, industry, current and past " +
            "company and title, school, headcount...",
        description:
            "Search LinkedIn members by keyword plus structured filters " +
            "(location, seniority, function, industry, current and past " +
            "company and title, school, headcount, tenure, experience) " +
            "and return each match as a full profile. Returns one row per " +
            "profile with profileUrl, handle, profileId, firstName, " +
            "lastName, headline, about, photo, coverPhoto, city, state, " +
            "country, followers, connections, verified, premium, " +
            "influencer, openToWork, openProfile, hiring, creator, " +
            "experience, education, certifications, projects, courses, " +
            "publications, volunteering, receivedRecommendations, skills " +
            "and 4 more fields. When you already have profile URLs use " +
            "mindcase#linkedin/profiles, which skips the search page fee; " +
            "to list everyone at one company use " +
            "mindcase#linkedin/company-employees. $0.004 per profile; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/linkedin/profiles",
        categories: ["linkedin", "people-enrichment"],
        notes: [
            "Billed a flat $0.05 search fee per run, charged even when " +
            "nothing is found, plus the per-profile rate; maxProfiles " +
            "must be a multiple of 25.",
            "At least one of searchQuery or a search filter is required.",
        ],
    },
    endpoint: "/linkedin/profiles/search",
    request: { method: "POST", path: "/v1/data/linkedin/profiles/run" },
    input: {
        schema: {
            body: zLinkedinProfilesBody.omit({ queries: true }).extend({
                maxProfiles: zLinkedinProfilesBody.shape.maxProfiles.unwrap()
                    .min(25).multipleOf(25),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                search_page: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "search fee",
                    description:
                        "one flat fee per search run, charged even when nothing is found",
                    consumes: { credit: "default", amount: 0.05 },
                },
                profile: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "profiles",
                    description: "profiles enriched from the search",
                    consumes: { credit: "default", amount: 0.004 },
                },
            },
        },
        estimate: ({ data }) => ({
            // Flat per run, not per 25-profile page: our billing rule
            // (MIN-185). Settled prod runs 2026-11-14: maxProfiles 175
            // -> 66 rows, $0.314 = $0.05 + 66 x $0.004; maxProfiles 150
            // -> 123 rows, $0.542 = $0.05 + 123 x $0.004.
            counts: {
                search_page: 1,
                profile: data.input.body.maxProfiles,
            },
        }),
        evidence: ({ data, utils }) => {
            const rows = utils.json.optionalLen(data.output, "$.data") ?? 0;
            return {
                counts: { search_page: 1, profile: rows },
            };
        },
    },
});
