import { z } from "zod";
import {
    QUERY_TIME_FORMAT,
    TIME_BOUND_FORMAT,
    zKeenableTimeBound,
} from "../../../schema/common.ts";

/**
 * POST /v1/search body — OpenAPI SearchRequest (docs.keenable.ai
 * api-reference/openapi.json, 2026-09-16). Mirror carries optionality
 * only (D25): `max_results` vendor default 10 is not a billing knob
 * (the model is PER_CALL), so it stays optional. Bounds (`.min`/`.max`
 * / `/\S/`) live at the binding in endpoint.ts.
 *
 * `z.looseObject`: unspecified vendor-forward keys ride through.
 * `mode` is not in the OpenAPI but the REST body takes it: `pro` and
 * `realtime` each drew one credit (drill 2026-09-28; design D3).
 */
export const zKeenableSearchBody = z.looseObject({
    query: z.string().describe(
        "The search query. Natural language; describe the page you want. " +
            "Add a language word (e.g. 'English') or site to collapse " +
            "language variants of the same page.",
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
        "Filter to pages published at or after this instant. For news, " +
            "use a short relative window such as '2d'. " + TIME_BOUND_FORMAT,
    ),
    published_before: zKeenableTimeBound.optional().describe(
        "Filter to pages published at or before this instant. " +
            TIME_BOUND_FORMAT,
    ),
    // The Unix epoch must be a string: a JSON number is a 400 upstream
    // (drill 2026-10-01).
    query_time: zKeenableTimeBound.optional().describe(
        "Search the index as it stood at this instant: the answer the " +
            "index would have given then. " + QUERY_TIME_FORMAT + " " +
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
    mode: z.string().describe(
        "Search mode: 'pro' (default) for deeper retrieval, 'realtime' " +
            "for the fastest results. Same price.",
    ).optional(),
});
