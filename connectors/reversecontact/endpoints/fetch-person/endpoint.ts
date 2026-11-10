import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFetchPersonBody } from "./schema/inputs.ts";

/** POST /v2/fetch/persons: one person's profile, from the cached
 *  database, by profile URL or Reverse Contact id. */
export default defineEndpoint({
    meta: {
        displayName: "Fetch Person Profile",
        summary: "Read a person's full professional profile from their " +
            "LinkedIn URL or Reverse Contact id.",
        description: "Read one person's full professional profile by " +
            "LinkedIn profile URL or Reverse Contact id (`prs_...`). " +
            "Returns identity (name, headline, summary, photo, location), " +
            "the current position, the full work history with companies, " +
            "titles and dates, education, skills, languages, " +
            "certifications, recommendations and follower counts, plus " +
            "`metadata.updatedAt` for freshness. Reach for it when the " +
            "profile URL is already known: to start from a work email or " +
            "a name, use `reversecontact#v2/enrich/persons`. Reads the " +
            "cached database: a profile it does not hold answers 404 and " +
            "costs nothing. 1 credit per profile returned.",
        docsUrl: "https://docs.reversecontact.com/endpoints/fetch-profile",
        categories: ["people-enrichment"],
        notes: [
            "An `id` that resolves to no profile answers 422 " +
            "`VALIDATION_ERROR`, free.",
        ],
    },
    request: { method: "POST", path: "/v2/fetch/persons" },
    input: { schema: { body: zFetchPersonBody } },
    timeouts: { requestMs: 35_000, runMs: 40_000 },
    usage: {
        /** Metered in Reverse Contact credits; the provider's evidence
         *  reads the receipt (1 on a hit, 0 on a miss). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "profile",
            description: "Reverse Contact credits as the receipt reports " +
                "them: 1 per profile returned",
        },
        estimate: () => ({ counts: { CREDIT: 1 } }),
    },
});
