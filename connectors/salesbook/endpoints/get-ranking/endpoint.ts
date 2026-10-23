import { defineEndpoint } from "@shared/core";
import { zSalesbookRankingBody } from "./schema/inputs.ts";

/** POST /v1/tools/get_ranking: a sector's full ranked list. */
export default defineEndpoint({
    meta: {
        displayName: "SalesBook Sector Ranking",
        summary: "A sector's ranked list of enterprise tech vendors.",
        description: "Pull one sector's SalesBook ranking for a period: " +
            "the methodology version and its component weights, then " +
            "every ranked company with its rank, SalesBook id, total " +
            "score, evidence grade, one-line description and component " +
            "scores (buyer fit, commercial proof, stage maturity, pilot " +
            "mechanics, team trajectory, evaluation completeness). " +
            "`text` is that ranking as a JSON document; parse it. Up to " +
            "100 companies, so the response is large (about 50 KB): use " +
            "search_startups when you only need matches for a keyword, " +
            "and get_profile for one company's sources.",
        docsUrl: "https://mcp.maxeds.org/v1/openapi.json",
    },
    request: { method: "POST", path: "/v1/tools/get_ranking" },
    input: {
        schema: {
            body: zSalesbookRankingBody.extend({
                period: zSalesbookRankingBody.shape.period.unwrap().min(1)
                    .optional(),
            }),
        },
    },
});
