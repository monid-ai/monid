import { UsageModelKind } from "@shared/core";

/**
 * RATE CARD — OPEN ITEM. This file is the ONE place the Dim Hour connector
 * states what it charges, isolated so the business decision can land
 * without touching the transport, schemas or tests.
 *
 * What is SOURCED (https://dimhour.com/mcp.html, read 2026-09-24):
 *   - Free tier: $0, 1,000 calls a day anonymously, 10,000 with a free
 *     key. Terms: "Assistant use. No bulk extraction, no redistribution".
 *   - MCP Commercial: $499 / month, "No daily cap. 250,000 calls a month
 *     included, then $2 per 1,000". Terms: "Serving your own product's
 *     users, at your own volume".
 *
 * What is NOT settled: which of those terms (or a separately agreed rate)
 * covers Monid's traffic. That is a business term between Dim Hour and
 * Monid, not a coding choice, so this file does not pick one.
 *
 * What the model below says, and does not say: every successful run draws
 * ONE unit from the `default` pool, whose unit is a Dim Hour MCP call. That
 * is the unit both published tiers meter in. It carries NO money: the
 * credit → money conversion is the broker card's per-provider fact (design
 * D26), and it stays open until the terms are agreed. The model is NOT
 * `FREE` on purpose: `FREE` would publish commercial Monid traffic as
 * permanently free, which no source says.
 */
export const DIMHOUR_CREDITS = {
    default: {
        label: "Dim Hour MCP calls",
        description: "One successful Dim Hour MCP tools/call. The money " +
            "value of a call is not yet agreed between Dim Hour and Monid.",
    },
};

export const DIMHOUR_USAGE_MODEL = {
    kind: UsageModelKind.PER_CALL,
    consumes: { credit: "default", amount: 1 },
    label: "call",
    description: "one successful MCP tools/call",
} as const;
