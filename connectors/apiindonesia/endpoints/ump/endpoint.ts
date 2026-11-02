import { defineEndpoint } from "@shared/core";
import { zUmpQueryParams } from "./schema/inputs.ts";

/**
 * GET /api/v1/ump. Inherits the provider's flat 2-credit
 * PER_CALL (one successful request = Rp2); a non-2xx answer settles at
 * zero.
 */
export default defineEndpoint({
    meta: {
        displayName: "Indonesia Provincial Minimum Wage",
        summary:
            "Indonesia's provincial minimum wage (UMP) by year and province.",
        description:
            "List Indonesia's provincial minimum wage (Upah Minimum Provinsi, UMP) in " +
            "rupiah per month, latest year first, for every province from 1997 on. " +
            "Filter by year, by a partial province name, or by a salary range. Use it " +
            "for payroll checks, salary benchmarking or cost-of-living comparisons " +
            "between provinces. Regency-level minimum wages (UMK) are not included.",
        docsUrl: "https://docs.apiindonesia.id/en/docs/#ump",
        categories: ["government-data"],
    },
    request: { method: "GET", path: "/ump" },
    input: { schema: { queryParams: zUmpQueryParams } },
});
