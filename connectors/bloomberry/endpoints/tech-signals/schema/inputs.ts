import { z } from "zod";
import {
    zCompanyFilters,
    zCursor,
    zDate,
    zDomain,
} from "../../../schema/common.ts";

/** Bloomberry GET /signals/tech.json query params — the faithful vendor
 *  mirror (docs.bloomberry.com/reference/get_signals-tech-json). Exactly
 *  one of `vendor_name` / `category` selects the tool; `domain` instead
 *  scopes to one company and makes the vendor selectors irrelevant. */
export const zTechSignalsQueryParams = zCompanyFilters.extend(zCursor.shape)
    .extend({
        vendor_name: z.string().min(1).optional().describe(
            "The vendor to watch, e.g. 'Google Workspace'. Use this OR " +
                "`category`, not both. Valid values: " +
                "https://api.revealera.com/vendors.txt",
        ),
        category: z.string().min(1).optional().describe(
            "A product category to watch, e.g. 'customer relationship " +
                "management', or 'all'. Use this OR `vendor_name`, not both. " +
                "Valid values: https://api.revealera.com/categories.txt",
        ),
        domain: zDomain.optional().describe(
            "Scope to one company's own changes. When set, `vendor_name` " +
                "and `category` are ignored.",
        ),
        begin_date: zDate.optional().describe(
            "Start of the change-date range. Default: the first date in the " +
                "dataset.",
        ),
        end_date: zDate.optional().describe(
            "End of the change-date range. Default: today.",
        ),
        new_only: z.boolean().optional().describe(
            "true returns only new installs / new usage (adoptions). " +
                "Default false.",
        ),
        churn_only: z.boolean().optional().describe(
            "true returns only churn changes (unsubscribed / stopped " +
                "usage / downgrades). Default false returns every change " +
                "type.",
        ),
        omit_churned: z.boolean().optional().describe(
            "true drops companies that no longer use the vendor. Default " +
                "false.",
        ),
        omit_current_customers: z.boolean().optional().describe(
            "true drops companies that currently use the vendor. Default " +
                "false.",
        ),
    });
