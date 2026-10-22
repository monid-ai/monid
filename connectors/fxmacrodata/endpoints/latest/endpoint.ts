import { defineEndpoint } from "@shared/core";
import { zCurrencyPathParams } from "../../schema/common.ts";

/**
 * GET /v1/announcements/{currency}/latest — the newest released value of
 * every indicator for one currency, with the previous value and the
 * change between them. Keyless for USD.
 */
export default defineEndpoint({
    meta: {
        displayName: "FXMacroData Latest Announcements",
        summary: "Latest released value of every indicator for a currency.",
        description: "One row per indicator for the currency: the latest " +
            "released value and the one before it, each with its period " +
            "date and announcement timestamp (Unix seconds), plus the " +
            "percentage change from the previous release, unit, " +
            "frequency and publisher. A quick macro snapshot of a " +
            "currency in one call. USD works without an API key, with " +
            "new releases appearing 15 minutes after publication " +
            "(`freemium_delay` says when); other currencies need a key.",
        categories: ["economic-data"],
    },
    request: { method: "GET", path: "/v1/announcements/{currency}/latest" },
    input: { schema: { pathParams: zCurrencyPathParams } },
});
