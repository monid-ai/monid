import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zKitchenSinkPersonBody } from "./schema/inputs.ts";

/** POST /v1/kitchen-sink/person — resolve a person from loose inputs. */
export default defineEndpoint({
    meta: {
        displayName: "Find Person",
        summary: "Resolve a person from any mix of name, company, email, " +
            "title, school, location, or LinkedIn URL.",
        description: "Find a person from whatever signals you have — a " +
            "LinkedIn slug, URL, or user ID; an email; a name plus " +
            "current company (name, domain, or LinkedIn identifier); job " +
            "title; LinkedIn headline; school; location. More signals " +
            "mean better matches. Returns { output: { data: [profile] } } " +
            "best match first, each with LinkedIn URL, name, headline, " +
            "current and past jobs, education, skills, and location. Set " +
            "liveFetch to refresh each match from LinkedIn (extra charge), " +
            "forceCompanyMatch to require the given employer, and " +
            "getDetailedWorkExperience for each employer's domain, size, " +
            "and revenue. Does not return emails or phone numbers — chain " +
            "to fiber#contact-details/lite with the LinkedIn URL.",
        docsUrl: "https://api.fiber.ai/ai-docs/KitchenSinkProfile.md",
        categories: ["people-enrichment", "linkedin"],
        notes: [
            "Provide at least one identifying field (profileIdentifier, " +
            "emailAddress, or personName with a company or school); " +
            "location and title alone only re-rank.",
            "No match answers 200 with an empty `data` and costs nothing.",
            "With the default thoroughness 'high' a hard lookup can take " +
            "up to about a minute.",
        ],
    },
    request: { method: "POST", path: "/kitchen-sink/person" },
    input: {
        schema: {
            // numProfiles and liveFetch select the billed quantities:
            // Fiber's defaults materialized at the binding (D25).
            body: zKitchenSinkPersonBody.extend({
                numProfiles: zKitchenSinkPersonBody.shape.numProfiles.unwrap()
                    .default(1),
                liveFetch: zKitchenSinkPersonBody.shape.liveFetch.unwrap()
                    .default(false),
            }),
        },
    },
    usage: {
        /** Two lines (Fiber platform defaults): `kitchenSinkPerson` 2
         *  credits per person returned, plus `liveEnrichPerson` 2 credits
         *  per person fetched live when liveFetch is set. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                lookup: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "people found",
                    consumes: { credit: "default", amount: 2 },
                },
                live_fetch: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "live profile fetches",
                    description: "only when liveFetch is set",
                    consumes: { credit: "default", amount: 2 },
                },
            },
        },
        estimate: ({ data }) => ({
            counts: {
                lookup: data.input.body.numProfiles,
                live_fetch: data.input.body.liveFetch
                    ? data.input.body.numProfiles
                    : 0,
            },
        }),
        /** Fiber bills live fetches it actually performed, which the
         *  response does not itemize; counting one per returned person
         *  is the ceiling, and `chargeInfo` (the claim) settles the
         *  truth with any gap surfacing as `usage.mismatch`. */
        evidence: ({ data, utils }) => {
            const found = utils.json.optionalLen(
                data.output,
                "$.output.data",
            ) ?? 0;
            return {
                counts: {
                    lookup: found,
                    live_fetch: data.input.body.liveFetch ? found : 0,
                },
            };
        },
    },
});
