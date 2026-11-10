import { type Json, Unit, UsageModelKind } from "@shared/core";
import { zKeenableSearchBody } from "../endpoints/search/schema/inputs.ts";

/**
 * Binding-side tightening for every Keenable search doc (D25 / D8):
 * `.min(1)` plus `/\S/` so whitespace-only strings fail INVALID_INPUT
 * before the wire call. A zod `.trim()` does not survive
 * `z.toJSONSchema`.
 */
export const zKeenableTimeBoundBinding = zKeenableSearchBody.shape.query_time
    .unwrap().min(1).regex(/\S/);

/** `.unwrap()` drops the field-level `.describe()` (it sits on the
 *  optional wrapper), so re-apply each field's own description after
 *  tightening. */
type TimeBoundField =
    | "acquired_after"
    | "acquired_before"
    | "published_after"
    | "published_before"
    | "query_time";

function tightenTimeBound(field: TimeBoundField) {
    const source = zKeenableSearchBody.shape[field];
    const tightened = zKeenableTimeBoundBinding;
    return source.description !== undefined
        ? tightened.describe(source.description)
        : tightened;
}

export function keenableSearchBodySchema(options?: {
    queryTimeRequired?: boolean;
    publishedAfterDefault?: string;
    snippetMaxLengthDefault?: number;
}) {
    const publishedAfter = options?.publishedAfterDefault !== undefined
        ? tightenTimeBound("published_after").default(
            options.publishedAfterDefault,
        )
        : tightenTimeBound("published_after").optional();
    const queryTime = options?.queryTimeRequired === true
        ? tightenTimeBound("query_time")
        : tightenTimeBound("query_time").optional();
    const snippet = zKeenableSearchBody.shape.snippet_max_length
        .unwrap().min(180).max(10000);
    const snippetMaxLength = options?.snippetMaxLengthDefault !== undefined
        ? snippet.default(options.snippetMaxLengthDefault)
        : snippet.optional();
    return zKeenableSearchBody.extend({
        query: zKeenableSearchBody.shape.query.min(1).regex(/\S/),
        site: zKeenableSearchBody.shape.site.unwrap().min(1).regex(/\S/)
            .optional(),
        acquired_after: tightenTimeBound("acquired_after").optional(),
        acquired_before: tightenTimeBound("acquired_before").optional(),
        published_after: publishedAfter,
        published_before: tightenTimeBound("published_before").optional(),
        query_time: queryTime,
        snippet_max_length: snippetMaxLength,
        max_results: zKeenableSearchBody.shape.max_results
            .unwrap().min(1).max(50).optional(),
    });
}

/**
 * Search bills PER_UNIT RESULT, 0 when `results: []` (design D2). Shared
 * by the five docs that hit `POST /v1/search`.
 */
export const keenableSearchUsage = {
    model: {
        kind: UsageModelKind.PER_UNIT,
        unit: Unit.RESULT,
        label: "searches with results",
        description: "searches whose response carried at least one " +
            "result",
        consumes: { credit: "default", amount: 0.001 },
    },
    /** The hold promises one search. */
    estimate: () => ({ counts: { RESULT: 1 } }),
    /** v1 `searchActuals`: 0 for `results: []` (the vendor still
     *  deducts the credit, the buyer is not charged) or a non-object
     *  body, 1 for any other 2xx object. */
    evidence: ({ data }: { data: { output: Json } }) => {
        const body = data.output;
        if (
            typeof body !== "object" || body === null ||
            Array.isArray(body)
        ) {
            return { counts: { RESULT: 0 } };
        }
        const results = (body as Record<string, unknown>).results;
        const empty = Array.isArray(results) && results.length === 0;
        return { counts: { RESULT: empty ? 0 : 1 } };
    },
};
