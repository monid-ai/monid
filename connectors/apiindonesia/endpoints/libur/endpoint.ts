import { defineEndpoint } from "@shared/core";
import { zLiburQueryParams } from "./schema/inputs.ts";

/**
 * GET /api/v1/libur. Inherits the provider's flat 2-credit
 * PER_CALL (one successful request = Rp2); a non-2xx answer settles at
 * zero.
 */
export default defineEndpoint({
    meta: {
        displayName: "Indonesia Public Holidays",
        summary:
            "Indonesian national holidays and joint leave days (cuti bersama) by year " +
            "and month.",
        description:
            "List Indonesia's official public holidays for a year, optionally " +
            "narrowed to one month, sorted by date. Rows follow the SKB 3 Menteri " +
            "decree and include the government's joint leave days (cuti bersama), " +
            "flagged by `type` and `is_joint_leave`, plus the source each row was " +
            "taken from. Use it to check whether a date is a working day in " +
            "Indonesia, to plan deadlines or deliveries around Lebaran and Natal, or " +
            "to build a business-day calendar. It covers national holidays only, not " +
            "regional ones.",
        docsUrl: "https://docs.apiindonesia.id/en/docs/#hari-libur",
        categories: ["government-data", "events"],
    },
    request: { method: "GET", path: "/libur" },
    input: { schema: { queryParams: zLiburQueryParams } },
});
