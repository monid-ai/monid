import { z } from "zod";
import {
    TIME_BOUND_FORMAT,
    zKeenableTimeBound,
} from "../../../schema/common.ts";

/**
 * POST /v1/search body — OpenAPI SearchRequest (docs.keenable.ai
 * api-reference/openapi.json, 2026-09-16). Mirror carries optionality
 * only (D25): `max_results` vendor default 10 is not a billing knob
 * (the model is PER_CALL), so it stays optional. Bounds (`.min`/`.max`)
 * live at the binding in endpoint.ts.
 *
 * `z.looseObject`: unspecified vendor-forward keys ride through.
 * `mode` is decided per call by Keenable and is not a REST request
 * field (credits docs; design D3) — `z.never()` rejects a pasted SDK
 * payload that sends it.
 */
export const zKeenableSearchBody = z.looseObject({
    query: z.string().describe(
        "The search query. Natural language; describe the page you want.",
    ),
    site: z.string().describe(
        "Restrict results to a specific site, e.g. 'techcrunch.com' or " +
            "'arxiv.org'.",
    ).optional(),
    acquired_after: zKeenableTimeBound.optional().describe(
        "Filter to pages Keenable acquired/indexed at or after this " +
            "instant. " + TIME_BOUND_FORMAT,
    ),
    acquired_before: zKeenableTimeBound.optional().describe(
        "Filter to pages Keenable acquired/indexed at or before this " +
            "instant. " + TIME_BOUND_FORMAT,
    ),
    published_after: zKeenableTimeBound.optional().describe(
        "Filter to pages published at or after this instant. " +
            TIME_BOUND_FORMAT,
    ),
    published_before: zKeenableTimeBound.optional().describe(
        "Filter to pages published at or before this instant. " +
            TIME_BOUND_FORMAT,
    ),
    query_time: zKeenableTimeBound.optional().describe(
        "Search the index as it stood at this instant: pages acquired " +
            "after it are excluded. A date resolves to 00:00:00 UTC (not " +
            "the end of the day). Relative deltas on the other date " +
            "filters resolve against this instant instead of now. " +
            TIME_BOUND_FORMAT,
    ),
    snippet_max_length: z.number().int().describe(
        "Maximum length, in characters, of the snippet returned per " +
            "result (180–10000). When omitted, a default snippet " +
            "length is used.",
    ).optional(),
    max_results: z.number().int().describe(
        "Maximum number of results to return (1–50). When omitted, up " +
            "to 10 results are returned.",
    ).optional(),
    mode: z.never().optional().describe(
        "Not a REST request field. Keenable decides search mode per " +
            "call; a pasted SDK `mode` fails INVALID_INPUT.",
    ),
});
