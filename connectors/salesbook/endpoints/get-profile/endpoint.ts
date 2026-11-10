import { defineEndpoint } from "@shared/core";
import { zSalesbookProfileBody } from "./schema/inputs.ts";

/** POST /v1/tools/get_profile: one company's sourced profile. */
export default defineEndpoint({
    meta: {
        displayName: "SalesBook Company Profile",
        summary: "One ranked company's sourced profile, by SalesBook id.",
        description: "Read the SalesBook profile of one ranked company: " +
            "its sector rank, what it does, and its sourced fields " +
            "(website, headquarters, public proof such as funding or " +
            "named customers), each with the URL it was read from and " +
            "the date the profile was last checked. Takes a " +
            "SalesBook id, not a name or domain: get one from " +
            "search_startups first. An unknown id is a 400 that says how " +
            "to find the right one.",
        docsUrl: "https://mcp.maxeds.org/v1/openapi.json",
    },
    request: { method: "POST", path: "/v1/tools/get_profile" },
    input: {
        schema: {
            body: zSalesbookProfileBody.extend({
                startup_id: zSalesbookProfileBody.shape.startup_id.min(1),
            }),
        },
    },
});
