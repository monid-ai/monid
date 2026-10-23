import { defineEndpoint } from "@shared/core";
import { zSalesbookSearchBody } from "./schema/inputs.ts";

/** POST /v1/tools/search_startups: keyword search over the ranked corpus. */
export default defineEndpoint({
    meta: {
        displayName: "SalesBook Search",
        summary: "Find ranked enterprise tech vendors for a problem keyword.",
        description: "Search SalesBook's ranked directory of technology " +
            "companies that sell to enterprises by problem or product " +
            "keyword, optionally within one sector. Each match is one " +
            "line: sector rank, company name, sector, a one-line " +
            "description, its SalesBook id, and the source URL. Matching " +
            "is by keyword and can be broad: a company that shares one " +
            "generic word with the query (say 'vendor') can be returned, " +
            "so check each match's description. A query with no matching " +
            "word says so in `text`. Pass " +
            "a returned id to SalesBook get_profile for the sourced " +
            "profile, or to find_alternatives for ranked competitors.",
        docsUrl: "https://mcp.maxeds.org/v1/openapi.json",
    },
    request: { method: "POST", path: "/v1/tools/search_startups" },
    input: {
        schema: {
            body: zSalesbookSearchBody.extend({
                query: zSalesbookSearchBody.shape.query.min(1),
                limit: zSalesbookSearchBody.shape.limit.unwrap().min(1)
                    .max(25).optional(),
            }),
        },
    },
});
