import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zVendorsQueryParams } from "./schema/inputs.ts";

/** GET /vendors/all_vendors.json — the vendor catalog (free). */
export default defineEndpoint({
    meta: {
        displayName: "Bloomberry Vendor Catalog",
        summary: "Every vendor Bloomberry has technographic data for.",
        description: "The catalog of 1,700+ vendors Bloomberry tracks, " +
            "ordered by category then name: each with its id, name, URL, " +
            "category and upper-level category, market segment (Enterprise " +
            "/ Mid-Market / SMB / Shopify), descriptive topics, the " +
            "domains the vendor owns, how it is detected, and its stock " +
            "ticker if public. Use it to resolve the exact `vendor_name` " +
            "and `category` spellings that /signals/tech.json and " +
            "/accounts/tech.json accept, or to browse what is detectable. " +
            "Large response (every vendor, no paging). Free.",
        docsUrl:
            "https://docs.bloomberry.com/reference/get_vendors-all-vendors-json",
        categories: ["technographics"],
    },
    request: { method: "GET", path: "/vendors/all_vendors.json" },
    input: { schema: { queryParams: zVendorsQueryParams } },
    // Generous budget: the whole catalog comes back in one body.
    timeouts: { requestMs: 60_000, runMs: 60_000 },
    usage: {
        /** FREE — the vendor confirms the catalog draws no credits; the
         *  quantities fns are compiler-synthesized. */
        model: { kind: UsageModelKind.FREE },
    },
});
