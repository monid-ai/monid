import { z } from "zod";

/** Bloomberry GET /vendors/all_vendors.json query params — the faithful
 *  vendor mirror (docs.bloomberry.com/reference/get_vendors-all-vendors-json). */
export const zVendorsQueryParams = z.object({
    show_counts: z.boolean().optional().describe(
        "true adds, per vendor, the number of companies Bloomberry has " +
            "data for. Default false.",
    ),
});
