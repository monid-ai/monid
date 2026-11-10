import { defineEndpoint, UsageModelKind } from "@shared/core";
import {
    zResearchStatusPathParams,
    zResearchStatusQueryParams,
} from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Tavily Research Status",
        summary:
            "Retrieve an existing research job's status and report by request ID.",
        description:
            "Read an existing research task without submitting another " +
            "job. Pending jobs return HTTP 202; completed or failed jobs return " +
            "HTTP 200 with their status. Use /research to start a new task.",
        docsUrl:
            "https://docs.tavily.com/documentation/api-reference/endpoint/research-get",
        categories: ["web-search"],
        notes: [
            "Any usage in this response belongs to the original research job and is not billed again by this read.",
        ],
    },
    request: { method: "GET", path: "/research/{request_id}" },
    input: {
        schema: {
            pathParams: zResearchStatusPathParams,
            queryParams: zResearchStatusQueryParams,
        },
        // Do not inherit the POST body/usage injection on a GET request.
        toRequest: ({ data }) => ({
            pathParams: data.input.pathParams,
            queryParams: data.input.queryParams,
        }),
    },
    usage: {
        model: { kind: UsageModelKind.FREE },
        evidence: () => ({ counts: {} }),
        consolidate: ({ data }) => ({ credits: {}, output: data.output }),
    },
});
