import { defineEndpoint } from "@shared/core";
import { zCategoriesQueryParams } from "./schema/inputs.ts";

/**
 * `GET /api/v1/categories` — search the Google Maps category taxonomy that
 * mapsdata#jobs accepts. FREE (inherits the provider model).
 *
 * `q` is required at the binding: the vendor answers an empty `q` with an
 * empty list, so a call without it can only ever return nothing.
 */
export default defineEndpoint({
    meta: {
        displayName: "MapsData Category Search",
        summary: "Search the Google Maps categories a MapsData scrape " +
            "accepts.",
        description: "Search Google Maps business categories by substring " +
            "and get the exact names mapsdata#jobs accepts as `query`, " +
            "e.g. 'roof' returns 'Roofing contractor'. Use it to browse " +
            "when you do not know the category's name; to check one term " +
            "you already have, mapsdata#categories/validate returns the " +
            "canonical spelling directly. Free.",
        categories: ["maps"],
    },
    request: { method: "GET", path: "/categories" },
    input: {
        schema: {
            queryParams: zCategoriesQueryParams.extend({
                q: zCategoriesQueryParams.shape.q.unwrap().min(1),
            }),
        },
    },
});
