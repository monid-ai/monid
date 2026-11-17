import { z } from "zod";

/**
 * POST /v1/tools/compare_vendors body (OpenAPI v0.5.0, 2026-10-22).
 * The 2-5 bound on `vendors` is the vendor's own and lives at the
 * binding.
 */
export const zSalesbookCompareBody = z.object({
    vendors: z.array(z.string()).describe(
        "2 to 5 vendors to compare: company names, SalesBook ids or " +
            "websites, e.g. ['Glean', 'Notion'].",
    ),
    buyer_context: z.string().describe(
        "The buyer or use case the comparison is for, e.g. 'Fortune 500 " +
            "hospital revenue cycle'.",
    ).optional(),
});
