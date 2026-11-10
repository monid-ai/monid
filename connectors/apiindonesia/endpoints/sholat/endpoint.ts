import { defineEndpoint } from "@shared/core";
import { zSholatQueryParams } from "./schema/inputs.ts";

/**
 * GET /api/v1/sholat. Inherits the provider's flat 2-credit
 * PER_CALL (one successful request = Rp2); a non-2xx answer settles at
 * zero.
 */
export default defineEndpoint({
    meta: {
        displayName: "Indonesia Prayer Times",
        summary:
            "Daily Islamic prayer times for any Indonesian regency or city.",
        description:
            "Return one day of Islamic prayer times (imsyak, subuh, terbit, dzuhur, " +
            "ashar, maghrib, isya) in local time for an Indonesian regency or city, " +
            "identified by its 4-digit Kemendagri code. Defaults to today. Get the " +
            "code from `apiindonesia#wilayah/search` (a result with level " +
            "'kabupaten'). A code with no schedule answers 404, which is not billed. " +
            "It does not take coordinates or district/village codes.",
        docsUrl: "https://docs.apiindonesia.id/en/docs/#jadwal-sholat",
        categories: ["government-data", "events"],
    },
    request: { method: "GET", path: "/sholat" },
    input: { schema: { queryParams: zSholatQueryParams } },
});
