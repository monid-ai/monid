import { z } from "zod";

/** POST /news-search JSON body (drillr.ai/docs/api/news-search) — the
 *  one drillr endpoint that takes a body rather than query params.
 *  Documented cross-field rule, stated in the endpoint notes because a
 *  refinement cannot survive compilation: at least one of query, theme,
 *  ticker, since, until. */
export const zNewsSearchBody = z.object({
    query: z.string().min(1).describe(
        "Semantic query, in English. Combined with other filters, the " +
            "filters apply first and the query ranks what is left.",
    ).optional(),
    theme: z.string().min(1).describe(
        "Theme phrase, resolved to the nearest canonical theme and " +
            "echoed in `theme_resolved`. Not accepted when " +
            "`search_type` is `claims`.",
    ).optional(),
    ticker: z.union([z.string().min(1), z.array(z.string().min(1))])
        .describe(
            "One canonical ticker, an array of them, or one " +
                "comma-separated string; up to 50, combined as OR. US " +
                "bare symbols, China `.SH` / `.SZ` / `.BJ`, Japan `.T`. " +
                "Company names are not resolved.",
        ).optional(),
    since: z.string().min(1).describe(
        "ISO 8601 datetime. Keeps events and claims with " +
            "`time_event >= since`.",
    ).optional(),
    until: z.string().min(1).describe(
        "ISO 8601 datetime. Keeps events and claims with " +
            "`time_event < until`.",
    ).optional(),
    search_type: z.enum(["all", "events", "claims"]).describe(
        "`events` returns storylines only, `claims` attributed claims " +
            "only. Default: all.",
    ).optional(),
    order_by: z.enum(["relevance", "event_time", "create_time"]).describe(
        "Sort by relevance, event time, or ingestion time. Default: " +
            "relevance.",
    ).optional(),
    top_k: z.number().int().min(1).max(50).describe(
        "Number of storylines. Maximum 50. Default: 10.",
    ).optional(),
    cursor: z.string().min(1).describe(
        "The `next_cursor` of the previous page, passed back unchanged " +
            "with the same filters.",
    ).optional(),
}).strict();
