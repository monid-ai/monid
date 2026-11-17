import { z } from "zod";

/**
 * Date/time bounds Keenable accepts on search filters (OpenAPI
 * SearchRequest + docs "Date and time filters", 2026-09-16; the `w` unit
 * and Unix-epoch `query_time` drilled 2026-10-01). A single
 * string: the three spellings cannot be a JSON-Schema union without
 * dropping the relative form, so the formats live in the describe and
 * Keenable itself 400s a bad value. Tightening (`.min` / `/\S/`) lives
 * at the binding, not on this mirror — a zod `.trim()` does not survive
 * `z.toJSONSchema` (hunterio D7 / surf reconcile).
 */
export const TIME_BOUND_FORMAT =
    "YYYY-MM-DD (whole day UTC: an _after bound starts at 00:00:00, a " +
    "_before bound ends at 23:59:59.999), an ISO 8601 timestamp (no " +
    "offset means UTC), or a relative delta such as 7d, 2w, 30min, 6mo, " +
    "1y (units: min, h, d, w, mo, y; truncated to the minute).";

export const QUERY_TIME_FORMAT =
    "Same spellings as the other date filters, plus a Unix epoch in " +
    "seconds as a STRING (e.g. '1790000000' — a JSON number is a 400). " +
    "A date resolves to 00:00:00 UTC (not the end of the day). Relative " +
    "deltas on the other date filters resolve against this instant " +
    "instead of now. This is an upper bound: pages acquired after it " +
    "are excluded. It is not a recency filter; use published_after " +
    "for recent results.";

export const zKeenableTimeBound = z.string().describe(TIME_BOUND_FORMAT);
