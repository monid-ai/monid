import { z } from "zod";

/**
 * GET /v1/fetch query params — OpenAPI fetch parameters
 * (docs.keenable.ai api-reference/openapi.json, 2026-09-16). Mirror
 * carries optionality only (D25): `max_chars` vendor default 50000
 * is a behaviour knob the estimate does not read (the model is
 * PER_CALL), so it stays optional. Bounds live at the binding in
 * endpoint.ts. `live` draws one credit like an indexed fetch (MCP
 * `_meta["keenable/usage"]`, drill 2026-09-28; design D4). The
 * connector default for `live` is true (design D6) — vendor default
 * remains false; the binding overrides it so a URL missing from the
 * index is fetched from the source instead of becoming a provider
 * error.
 */
export const zKeenableFetchQueryParams = z.object({
    url: z.url({ protocol: /^https?$/ }).describe(
        "URL to fetch. Serves Keenable's indexed copy when the page is " +
            "in the index and fetches it live from the source otherwise " +
            "(the connector default). Set live: false for the indexed " +
            "copy only — a URL not in the index is then an error.",
    ),
    max_chars: z.number().int().describe(
        "Maximum number of characters of content to return. Longer " +
            "content is truncated and a notice is appended after the " +
            "cut, so the response runs slightly past this number. " +
            "Vendor default 50000.",
    ).optional(),
    live: z.boolean().describe(
        "Fetch the page live from the source instead of Keenable's " +
            "indexed copy. Connector default true (same price; a few " +
            "seconds slower). Set false to require the indexed copy.",
    ).optional(),
    prompt: z.string().describe(
        "Optional extraction instruction, at most 2000 characters. " +
            "When set, an LLM reads the fetched page and `content` " +
            "contains only the output for this instruction instead of " +
            "the full page. Example: 'List all pricing tiers with " +
            "their monthly prices'.",
    ).optional(),
}).strict();
