import { z } from "zod";
import { zCompanyFilters, zCursor } from "../../../schema/common.ts";

/** Bloomberry GET /accounts/tech.json query params — the faithful vendor
 *  mirror (docs.bloomberry.com/reference/get_accounts-tech-json). Exactly
 *  one of `vendor_name` / `category` selects the tool. */
export const zTechCustomersQueryParams = zCompanyFilters.extend(zCursor.shape)
    .extend({
        vendor_name: z.string().min(1).optional().describe(
            "The vendor whose current customers to list, e.g. 'Google " +
                "Workspace'. Use this OR `category`, not both. Valid " +
                "values: https://api.revealera.com/vendors.txt",
        ),
        category: z.string().min(1).optional().describe(
            "A product category, e.g. 'human capital management', or " +
                "'all'. Use this OR `vendor_name`, not both. Valid values: " +
                "https://api.revealera.com/categories.txt",
        ),
    });
