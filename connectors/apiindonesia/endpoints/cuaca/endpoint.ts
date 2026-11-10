import { defineEndpoint } from "@shared/core";
import { zCuacaQueryParams } from "./schema/inputs.ts";

/**
 * GET /api/v1/cuaca. Inherits the provider's flat 2-credit
 * PER_CALL (one successful request = Rp2); a non-2xx answer settles at
 * zero.
 */
export default defineEndpoint({
    meta: {
        displayName: "Indonesia Weather Forecast",
        summary:
            "3-day BMKG weather forecast for an Indonesian village or regency.",
        description:
            "Return BMKG's 3-day weather forecast in 3-hour steps for one Indonesian " +
            "village: weather (Indonesian and English labels), temperature, humidity, " +
            "cloud cover, precipitation, wind and local time. Pass `adm4` (village " +
            "code from `apiindonesia#cuaca/search`) or `kabupaten_id` (4-digit " +
            "regency code from `apiindonesia#wilayah/search`) for a representative " +
            "village of that regency. Forecasts only, no historical weather.",
        docsUrl: "https://docs.apiindonesia.id/en/docs/#cuaca",
        categories: ["government-data"],
    },
    request: { method: "GET", path: "/cuaca" },
    input: { schema: { queryParams: zCuacaQueryParams } },
});
