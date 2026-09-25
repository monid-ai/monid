import { z } from "zod";

/**
 * The filter grammar both DataForB2B searches share (docs "Filters
 * System"): a group `{op, conditions}` whose conditions are either a
 * `{column, type, value, value2?}` leaf or a nested group. The vendor
 * grammar is recursive; this mirror spells out TWO levels (a top group
 * holding leaves and/or sub-groups of leaves), which covers every
 * documented query shape without a self-referencing schema. Columns stay
 * free strings: each search describes its own column list, and the
 * vendor grants extra columns per account, so an enum here would reject
 * valid input at our gate.
 */
const zOperator = z.enum(["=", ">", ">=", "<", "<=", "between", "in", "like"])
    .describe(
        "`=` exact match (case-insensitive, full phrase in order); `like` " +
            "all words present in any order; `in` any value of a JSON " +
            "array (a comma-separated string is ONE literal and matches " +
            "nothing); `between` needs `value2`; `>`/`>=`/`<`/`<=` for " +
            "numbers and dates.",
    );

const zOp = z.enum(["and", "or"]).describe(
    "`and`: every condition must match; `or`: at least one must match.",
);

export const zFilterCondition = z.object({
    column: z.string().min(1).describe(
        "Column to filter on (see this endpoint's description for the list).",
    ),
    type: zOperator,
    value: z.unknown().describe(
        "Value to compare against: a string, number or boolean, or a JSON " +
            "array with `in`.",
    ),
    value2: z.unknown().optional().describe(
        "Upper bound, only with `between`.",
    ),
});

export const zFilterSubGroup = z.object({
    op: zOp,
    conditions: z.array(zFilterCondition).min(1),
});

export const zFilterGroup = z.object({
    op: zOp,
    conditions: z.array(z.union([zFilterCondition, zFilterSubGroup])).min(1)
        .describe("Conditions, or nested `{op, conditions}` groups."),
});

/** The body both searches take (docs "Request Body"). */
export const zSearchBody = z.object({
    filters: zFilterGroup.optional(),
    offset: z.number().int().min(0).optional().describe(
        "Results to skip, for pagination. Vendor default 0.",
    ),
    count: z.number().int().min(1).max(1000).optional().describe(
        "Results to return, 1-1000. Vendor default 25.",
    ),
    enrich_live: z.boolean().optional().describe(
        "true: fetch fresh data at query time (1.5 credits per result); " +
            "false: serve indexed data (0.75 credits per result).",
    ),
});
