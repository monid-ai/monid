import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinProfilesBody } from "../../schema/linkedin-profiles.ts";

/**
 * Mindcase `linkedin/profiles` (by profile URL). Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "LinkedIn Profiles by URL",
        summary: "Fetch full LinkedIn member profiles from profile URLs, " +
            "without logging in.",
        description: "Fetch full LinkedIn member profiles from profile URLs, " +
            "without logging in. Returns one row per profile with " +
            "profileUrl, handle, profileId, firstName, lastName, " +
            "headline, about, photo, coverPhoto, city, state, country, " +
            "followers, connections, verified, premium, influencer, " +
            "openToWork, openProfile, hiring, creator, experience, " +
            "education, certifications, projects, courses, publications, " +
            "volunteering, receivedRecommendations, skills and 4 more " +
            "fields. To find people by keyword, title, company or " +
            "location use mindcase#linkedin/profiles/search; to list " +
            "everyone at one company use " +
            "mindcase#linkedin/company-employees; for a work email use " +
            "mindcase#linkedin/emails. $0.004 per profile; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/linkedin/profiles",
        categories: ["linkedin", "people-enrichment"],
    },
    endpoint: "/linkedin/profiles",
    request: { method: "POST", path: "/v1/data/linkedin/profiles/run" },
    input: {
        schema: {
            body: zLinkedinProfilesBody.pick({ queries: true }).extend({
                queries: zLinkedinProfilesBody.shape.queries.unwrap().min(1),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.004 },
        },
        estimate: ({ data }) => ({
            counts: { RESULT: data.input.body.queries.length },
        }),
    },
});
