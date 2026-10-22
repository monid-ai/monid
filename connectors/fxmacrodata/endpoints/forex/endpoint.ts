import { defineEndpoint } from "@shared/core";
import { zForexPathParams, zForexQueryParams } from "./schema/inputs.ts";

const shape = zForexQueryParams.shape;

/**
 * GET /v1/forex/{base}/{quote} — daily official FX reference rates. Needs
 * an API key for every pair; without one the run settles as a 401
 * `api_key_required` provider error.
 */
export default defineEndpoint({
    meta: {
        displayName: "FXMacroData FX Rates",
        summary: "Daily official FX reference rates for a currency pair.",
        description: "Daily FX reference rates for any pair of the 22 " +
            "currencies, most recent first, taken from central-bank and " +
            "BIS reference rates. Inverse and cross pairs are derived " +
            "from those series and each row says how (`source`, " +
            "`pair_metadata`). Add technical indicators (sma_20, rsi_14, " +
            "macd, bollinger_bands, or `all`) computed on the same " +
            "series. Needs an FXMacroData API key.",
        categories: ["economic-data"],
        notes: [
            "Returns 401 api_key_required unless FXMACRODATA_API_KEY is " +
            "set.",
        ],
    },
    request: { method: "GET", path: "/v1/forex/{base}/{quote}" },
    input: {
        schema: {
            pathParams: zForexPathParams,
            queryParams: zForexQueryParams.extend({
                limit: shape.limit.unwrap().min(1).max(100).optional(),
                offset: shape.offset.unwrap().min(0).optional(),
                page: shape.page.unwrap().min(1).optional(),
            }),
        },
    },
});
