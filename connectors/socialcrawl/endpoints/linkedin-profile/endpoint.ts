import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinProfileQuery } from "./schema/inputs.ts";

/**
 * GET /v1/linkedin/profile — one member's public profile. 5 credits.
 * The About text, experience, education, and skills are other lanes.
 */
export default defineEndpoint({
    meta: {
        displayName: "LinkedIn Profile",
        summary: "Get a LinkedIn member's public profile.",
        description: "A LinkedIn member's public profile as one author: " +
            "name, headline, location, follower and connection counts, " +
            "profile picture, profile URL, and the member URN that every " +
            "other /v1/linkedin/profile/* lane joins on. The About " +
            "summary, experience, education, and skills are not on this " +
            "response. Use linkedin/profile/experiences, /educations, and " +
            "/skills for those, or linkedin/profile/all when you want " +
            "them in one call. This is the lane to start from when you " +
            "have a profile URL and need who the person is.",
        docsUrl: "https://www.socialcrawl.dev/platforms/linkedin/profile",
        categories: ["linkedin", "people-enrichment"],
        notes: [
            "5 credits. A cache hit is 0.",
            "verified is nullable. The reference text says the source " +
            "does not expose it, and the published example still returns " +
            "true, so do not discard a value that arrives. Experience, " +
            "education, and skills are separate endpoints at 5 credits each.",
        ],
    },
    request: { method: "GET", path: "/v1/linkedin/profile" },
    input: { schema: { queryParams: zLinkedinProfileQuery } },
    /** The page's own client budget is 37 seconds. */
    timeouts: { requestMs: 60_000, runMs: 70_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "credits",
            description: "SocialCrawl credits_used. The lane lists at 5.",
        },
        estimate: ({ data }) => {
            const dry = data.input.queryParams.dry_run;
            if (dry === 1) return { counts: {} };
            return { counts: { CREDIT: 5 } };
        },
    },
});
