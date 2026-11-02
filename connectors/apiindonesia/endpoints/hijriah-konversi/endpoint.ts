import { defineEndpoint } from "@shared/core";
import { zHijriahKonversiQueryParams } from "./schema/inputs.ts";

/**
 * GET /api/v1/hijriah/konversi. Inherits the provider's flat 2-credit
 * PER_CALL (one successful request = Rp2); a non-2xx answer settles at
 * zero.
 */
export default defineEndpoint({
    meta: {
        displayName: "Gregorian to Hijri Date (Indonesia)",
        summary: "Convert a Gregorian date to the Indonesian Hijri calendar.",
        description:
            "Convert one Gregorian date to its Hijri date following the Indonesian " +
            "Ministry of Religious Affairs calendar (hisab MABIMS): year, month " +
            "number, Indonesian month name and a formatted string. Use it for Islamic " +
            "dates as used in Indonesia. The official start of Ramadan or Syawal set " +
            "by rukyat can differ by 1-2 days.",
        docsUrl: "https://docs.apiindonesia.id/en/docs/#hijriah",
        categories: ["government-data", "events"],
    },
    request: { method: "GET", path: "/hijriah/konversi" },
    input: { schema: { queryParams: zHijriahKonversiQueryParams } },
});
