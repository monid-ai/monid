import { defineEndpoint } from "@shared/core";
import { zSalesbookAlternativesBody } from "./schema/inputs.ts";

/** POST /v1/tools/find_alternatives: ranked competitors to one vendor. */
export default defineEndpoint({
    meta: {
        displayName: "SalesBook Find Alternatives",
        summary: "Ranked alternatives to a named enterprise tech vendor.",
        description: "Given a vendor (name, SalesBook id or website), " +
            "list other ranked companies that solve the same problem, " +
            "ordered by SalesBook rank. Each alternative carries its " +
            "sector rank, evidence grade, website, one-line description, " +
            "whether it publishes an MCP server or llms.txt, and its " +
            "SalesBook id. A vendor SalesBook has not ranked, or one " +
            "with no ranked peers, returns a plain miss in `text`. Follow " +
            "with compare_vendors to put the shortlist side by side.",
        docsUrl: "https://mcp.maxeds.org/v1/openapi.json",
    },
    request: { method: "POST", path: "/v1/tools/find_alternatives" },
    input: {
        schema: {
            body: zSalesbookAlternativesBody.extend({
                company: zSalesbookAlternativesBody.shape.company.min(1),
                limit: zSalesbookAlternativesBody.shape.limit.unwrap()
                    .min(1).max(15).optional(),
            }),
        },
    },
});
