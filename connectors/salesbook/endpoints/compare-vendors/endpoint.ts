import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import { zSalesbookCompareBody } from "./schema/inputs.ts";

/** POST /v1/tools/compare_vendors: 2-5 ranked vendors side by side. */
export default defineEndpoint({
    meta: {
        displayName: "SalesBook Compare Vendors",
        summary: "Compare 2 to 5 enterprise tech vendors side by side.",
        description: "Put 2 to 5 vendors (names, SalesBook ids or " +
            "websites) side by side on SalesBook's ranking: sector rank, " +
            "buyer-readiness score, evidence grade, whether each " +
            "publishes an MCP server or llms.txt, a one-line summary and " +
            "the public deal evidence on file, then which vendor leads " +
            "on each. Vendors SalesBook has not ranked are reported as " +
            "such. Fewer than 2 or more than 5 vendors is rejected " +
            "before the call.",
        docsUrl: "https://mcp.maxeds.org/v1/openapi.json",
    },
    request: { method: "POST", path: "/v1/tools/compare_vendors" },
    input: {
        schema: {
            body: zSalesbookCompareBody.extend({
                vendors: z.array(z.string().min(1)).min(2).max(5).describe(
                    zSalesbookCompareBody.shape.vendors.description ?? "",
                ),
                buyer_context: zSalesbookCompareBody.shape.buyer_context
                    .unwrap().min(1).optional(),
            }),
        },
    },
});
