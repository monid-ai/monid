import { defineEndpoint } from "@shared/core";
import { zKursBiLatestQueryParams } from "./schema/inputs.ts";

/**
 * GET /api/v1/kurs-bi/latest. Inherits the provider's flat 2-credit
 * PER_CALL (one successful request = Rp2); a non-2xx answer settles at
 * zero.
 */
export default defineEndpoint({
    meta: {
        displayName: "Bank Indonesia Exchange Rates",
        summary: "Latest official Bank Indonesia IDR transaction rates.",
        description:
            "Return the latest Bank Indonesia transaction rates (kurs transaksi BI) " +
            "against the rupiah: buy, sell and mid rate per currency for the most " +
            "recent publication date. Defaults to USD, EUR and SGD; pass `currencies` " +
            "as comma-separated ISO codes for others. Use it when a rupiah conversion " +
            "must follow the official BI rate (invoices, tax, reporting). Rates are " +
            "published on Indonesian business days only.",
        docsUrl: "https://docs.apiindonesia.id/en/docs/#kurs-bi",
        categories: ["government-data"],
    },
    request: { method: "GET", path: "/kurs-bi/latest" },
    input: { schema: { queryParams: zKursBiLatestQueryParams } },
});
