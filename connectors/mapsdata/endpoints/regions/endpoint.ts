import { z } from "zod";
import { defineEndpoint } from "@shared/core";
import { zRegionsQueryParams } from "./schema/inputs.ts";

/**
 * `GET /api/v1/regions` — the exact region names mapsdata#jobs accepts in
 * `states`. FREE (inherits the provider model).
 */
export default defineEndpoint({
    meta: {
        displayName: "MapsData Regions",
        summary: "List the region names a MapsData scrape accepts for a " +
            "country.",
        description: "List the exact region names mapsdata#jobs accepts in " +
            "`states` for one country: US states, Canadian provinces and " +
            "territories, UK nations and regions, or Australian states and " +
            "territories. Submit them verbatim; abbreviations such as 'TX' " +
            "are rejected rather than expanded. Free.",
        categories: ["maps"],
    },
    request: { method: "GET", path: "/regions" },
    input: {
        schema: {
            queryParams: zRegionsQueryParams.extend({
                // the vendor mirror is a free string; the four markets
                // MapsData serves are the enforced set (an enum compiles to
                // JSON Schema, a pipe would not)
                country: z.enum(["us", "ca", "uk", "au"]).describe(
                    "One of us, ca, uk, au. The vendor defaults to us.",
                ).optional(),
            }),
        },
    },
});
