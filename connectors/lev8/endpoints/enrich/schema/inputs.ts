import { z } from "zod";

/**
 * `POST /v1/enrich` body — OpenAPI `EnrichRequest`
 * (docs.lev8.com/openapi.yaml, 2026-10-16). STRICT at the top level, as
 * Lev8's is. `enrich_fields` is itself a JSON Schema, so it stays open
 * beyond the two keys Lev8 requires (`type: "object"`, non-empty
 * `properties`).
 */
export const zLev8EnrichBody = z.strictObject({
    entity_context: z.string().min(1).describe(
        "What you already know about the entity: name, website, social " +
            "handles, an existing description. At most 16 KiB after " +
            "trimming.",
    ),
    enrich_fields: z.looseObject({
        type: z.literal("object"),
        // non-empty upstream (422 otherwise); a key-count rule does not
        // survive compilation, so it lives in the describe
        properties: z.record(z.string(), z.json()).describe(
            "The fields to generate, keyed by field name. At least one.",
        ),
    }).describe(
        "An object JSON Schema describing the fields to generate, e.g. " +
            '{"type":"object","properties":{"ceo":{"type":"string"}},' +
            '"required":["ceo"]}. At most 256 KiB, 12 levels deep and 200 ' +
            "properties in total.",
    ),
});
