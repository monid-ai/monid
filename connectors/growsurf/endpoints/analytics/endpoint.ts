import { defineEndpoint } from "@shared/core";
import { zCampaignPathParams } from "../../schema/common.ts";
import { zAnalyticsQueryParams } from "./schema/inputs.ts";

/**
 * `GET /campaign/{id}/analytics` — program results over a window.
 *
 * Analytics can be slower than the CRUD reads (a wide window with
 * `include=engagement` aggregates a lot), so this endpoint takes a longer
 * budget than the provider's 30 s.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Program Analytics",
        summary: "Read a program's results over a date window.",
        description: "Read what a program produced over a window — set " +
            "`days` for a trailing window or `startDate`/`endDate` for an " +
            "exact one. The totals cover participants, referrals, " +
            "referral-link views (total and unique), invites, and shares " +
            "broken down by network; an affiliate program adds " +
            "`totalRevenue`, `totalCommissions`, `totalCommissionCount` " +
            "and `uniqueCommissionReferrals`. `interval` adds a `series` " +
            "of per-period totals, and `include` adds the previous period " +
            "for comparison, status breakdowns, derived rates, email " +
            "performance, or participant engagement. Rates and " +
            "comparisons are ratios from 0 to 1. Money is in the " +
            "program's currency, in its minor unit.",
        docsUrl: "https://docs.growsurf.com/developer-tools/rest-api/" +
            "api-reference#get-campaign-id-analytics",
        categories: ["referrals"],
        notes: [
            "Give a window: either `days`, or both `startDate` and " +
            "`endDate`. Sending `days` alongside the pair is rejected.",
        ],
    },
    request: { method: "GET", path: "/campaign/{id}/analytics" },
    input: {
        schema: {
            pathParams: zCampaignPathParams,
            queryParams: zAnalyticsQueryParams,
        },
    },
    /** Wider than the provider default: a long window with
     *  `include=engagement` aggregates far more than a record read. */
    timeouts: { requestMs: 60_000, runMs: 65_000 },
});
