import { defineEndpoint } from "@shared/core";
import { zCurrencyPathParams } from "../../schema/common.ts";
import { zDataCatalogueQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/data_catalogue/{currency} — the indicators a currency publishes.
 *
 * Keyless for every currency. The response is an object keyed by
 * indicator slug; each entry carries name, unit, frequency, source and a
 * `coverage` block (earliest/latest dates, row count, freshness, and
 * `requires_api_key`).
 */
export default defineEndpoint({
    meta: {
        displayName: "FXMacroData Data Catalogue",
        summary: "List the indicators a currency publishes, with coverage.",
        description: "Every macroeconomic indicator FXMacroData serves for " +
            "one currency, keyed by the slug the other endpoints take. " +
            "Each entry gives the name, unit, frequency, publisher and " +
            "source series, seasonal adjustment, the series variants " +
            "(yoy, mom, sa/nsa) that can be selected, and coverage: " +
            "earliest and latest dates, row count, freshness, and whether " +
            "the series needs an API key. Works without a key for all 22 " +
            "currencies. Call this first to find the right indicator slug.",
        categories: ["economic-data"],
    },
    request: { method: "GET", path: "/v1/data_catalogue/{currency}" },
    input: {
        schema: {
            pathParams: zCurrencyPathParams,
            queryParams: zDataCatalogueQueryParams,
        },
    },
});
