import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLev8EnrichBody } from "./schema/inputs.ts";

/**
 * POST /v1/enrich — structured fields for a known entity.
 *
 * 2 credits when `success` is true, 0 when it is false — the deep-search
 * posture (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Lev8 Enrich",
        summary:
            "Fill a JSON Schema of fields for a company, person or account.",
        description: "Generate structured fields for an entity you " +
            "already have. Pass what you know about it (name, website, " +
            "social handles, a description) and an object JSON Schema of " +
            "the fields you want — company summary, current CEO, " +
            "category, funding stage, anything describable — and get back " +
            "an object that tries to match that schema. One entity per " +
            "call. Not for email addresses or phone numbers: use Lev8 " +
            "Contact Search. To discover entities in the first place use " +
            "Lev8 Entity Search.",
        docsUrl: "https://docs.lev8.com/api-reference/enrich/create",
        categories: ["company-enrichment", "people-enrichment"],
        notes: [
            "2 credits per successful enrichment. `success: false` is a " +
            "business-level failure and costs nothing.",
            "The answer TRIES to match `enrich_fields`; it is not " +
            "validated against it, so check required fields yourself.",
        ],
    },
    request: { method: "POST", path: "/v1/enrich" },
    input: { schema: { body: zLev8EnrichBody } },
    timeouts: { requestMs: 300_000, runMs: 300_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "successful enrichments",
            description: "enrichments returned with `success: true`",
            consumes: { credit: "default", amount: 2 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        evidence: ({ data, utils }) => ({
            counts: {
                RESULT: utils.json.optionalGet(data.output, "$.success") ===
                        true
                    ? 1
                    : 0,
            },
        }),
    },
});
