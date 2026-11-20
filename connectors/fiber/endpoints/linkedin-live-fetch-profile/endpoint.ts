import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zProfileLiveFetchBody } from "./schema/inputs.ts";

/** POST /v1/linkedin-live-fetch/profile/single — one live profile fetch. */
export default defineEndpoint({
    meta: {
        displayName: "Live Fetch LinkedIn Profile",
        summary: "Fetch a LinkedIn profile live: work history, education, " +
            "skills, location.",
        description: "Fetch a person's LinkedIn profile in real time from " +
            "a slug, profile URL, Sales Navigator URN, or LinkedIn user ID. " +
            "Returns { output: { found, profile } } — name, headline, " +
            "current and past jobs (titles, companies, dates), education, " +
            "skills, location, follower count, and profile picture. Set " +
            "getDetailedWorkExperience to also get each employer's " +
            "domain, size, and revenue estimate. Use this when freshness " +
            "matters (job changes, profiles not yet indexed); it does NOT " +
            "return emails or phone numbers — chain to " +
            "fiber#contact-details/lite for those.",
        docsUrl: "https://api.fiber.ai/ai-docs/profileLiveEnrich.md",
        categories: ["linkedin", "people-enrichment"],
        notes: [
            "A profile LinkedIn no longer serves answers 404 " +
            "`{message}`; Fiber still bills that lookup on " +
            "its side, but here it settles as a provider error with zero " +
            "usage.",
        ],
    },
    request: { method: "POST", path: "/linkedin-live-fetch/profile/single" },
    input: { schema: { body: zProfileLiveFetchBody } },
    usage: {
        /** `liveEnrichPerson` — 2 credits per profile fetched (Fiber
         *  platform default). Estimate and evidence are
         *  compiler-synthesized (flat model). */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "profile live fetch",
            consumes: { credit: "default", amount: 2 },
        },
    },
});
