import { z } from "zod";

/**
 * GET /v1/fetch query params — OpenAPI fetch parameters
 * (docs.keenable.ai api-reference/openapi.json, 2026-09-16), shared by
 * `keenable#v1/fetch` and `keenable#v1/fetch-answer`; each endpoint's
 * `schema/inputs.ts` composes it. Mirror carries optionality only
 * (D25): `max_chars` vendor default 50000 is a behaviour knob the
 * estimate does not read (the model is PER_CALL), so it stays
 * optional. Bounds live at the binding in each endpoint.ts. `live`
 * draws one credit like an indexed fetch (MCP `_meta["keenable/usage"]`,
 * drill 2026-09-28; design D4). `live` is left to the vendor default
 * (design D6, revised 2026-11-07): an omitted `live` serves the
 * indexed copy and reads the page live when it is not indexed, so a
 * URL missing from the index is not a provider error.
 */
export const zKeenableFetchParams = z.object({
    url: z.url({ protocol: /^https?$/ }).describe(
        "URL to fetch. By default Keenable serves its indexed copy " +
            "and reads the page live from the source when it is not " +
            "indexed. Set live: true to always read it live.",
    ),
    max_chars: z.number().int().describe(
        "Maximum number of characters of content to return. Longer " +
            "content is cut so it is never longer than this, ending in " +
            "'...' (no '...' when this is 3 or less), and the response " +
            "sets truncated: true and total_chars to the full length. " +
            "Vendor default 50000.",
    ).optional(),
    live: z.boolean().describe(
        "Always read the page live from the source instead of " +
            "serving Keenable's indexed copy (same price; a few seconds " +
            "slower). Use it for pages that change often. Omitted, " +
            "the indexed copy is served and unindexed pages are read " +
            "live automatically.",
    ).optional(),
    prompt: z.string().describe(
        "Optional extraction instruction, at most 2000 characters. " +
            "When set, an LLM reads the fetched page and `content` " +
            "contains only the output for this instruction instead of " +
            "the full page. Example: 'List all pricing tiers with " +
            "their monthly prices'.",
    ).optional(),
}).strict();
