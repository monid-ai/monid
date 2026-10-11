import { defineEndpoint } from "@shared/core";
import { zCategoriesValidateQueryParams } from "./schema/inputs.ts";

/**
 * `GET /api/v1/categories/validate` — resolve a term to its canonical Google
 * Maps category. FREE (inherits the provider model).
 */
export default defineEndpoint({
    meta: {
        displayName: "MapsData Category Check",
        summary: "Check a term against Google Maps categories and get the " +
            "exact spelling to scrape.",
        description: "Resolve a business-type term to the canonical Google " +
            "Maps category mapsdata#jobs accepts. Returns `{valid, " +
            "canonical, suggestions}`: when `valid` is true, submit " +
            "`canonical` verbatim (casing matters); when false, pick from " +
            "`suggestions`. An unrecognised category is the most common " +
            "reason a scrape is rejected, so call this before mapsdata#jobs " +
            "whenever the category came from free text. Free.",
        categories: ["maps"],
    },
    request: { method: "GET", path: "/categories/validate" },
    input: { schema: { queryParams: zCategoriesValidateQueryParams } },
});
