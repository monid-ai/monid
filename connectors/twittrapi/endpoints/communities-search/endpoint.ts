import { defineEndpoint } from "@shared/core";
import {
    zCommunitiesSearchPathParams,
    zCommunitiesSearchQueryParams,
} from "./schema/inputs.ts";

/**
 * `GET /communities/search/{searchTerm}` — find X Communities by keyword, one page per call.
 *
 * Billing, output and the wire profile are inherited from the provider:
 * one page per call at the flat per-call card, settled 0|1 off `data`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search X (Twitter) Communities",
        summary: "Find X Communities by keyword, one page per call.",
        description:
            "Find X (Twitter) Communities by keyword, one page per call: each " +
            "community's id, name, description, member count, rules, creator and " +
            "topic. Page further with `cursor`. For tweets about a topic across all " +
            "of X use twittrapi#search.",
        docsUrl:
            "https://www.twittrapi.com/docs/reference/communities-search-searchterm",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/communities/search/{searchTerm}" },
    input: {
        schema: {
            pathParams: zCommunitiesSearchPathParams,
            queryParams: zCommunitiesSearchQueryParams,
        },
    },
});
