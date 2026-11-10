import { defineEndpoint, UsageModelKind } from "@shared/core";
import {
    zTraceStatusPathParams,
    zTraceStatusQueryParams,
} from "./schema/inputs.ts";

/**
 * `GET /v1/traces/{id}`: a trace's status, what it has found so far while it
 * runs, and its headline numbers when done. The same read the
 * pressfront#traces poll makes, exposed for callers that started a trace and
 * want to check on it. FREE: reading a trace's status costs nothing.
 */
export default defineEndpoint({
    meta: {
        displayName: "Pressfront Trace Status",
        summary: "Check a Pressfront trace: status, what it found so far, " +
            "headline numbers.",
        description: "Read a Pressfront trace by id: its status (queued, " +
            "running, done, thin, failed), seconds left while it runs, " +
            "`soFar` (accounts and critical so far, the stage) once the first " +
            "results are in, and when done the headline counts by side plus " +
            "links to every part. `wait` (1 to 25) holds the answer until the " +
            "trace finishes, so repeat it rather than polling fast. Free.",
        docsUrl: "https://pressfront.co/developers",
        categories: ["twitter"],
    },
    endpoint: "/traces/{id}",
    request: { method: "GET", path: "/traces/{id}" },
    input: {
        schema: {
            pathParams: zTraceStatusPathParams,
            queryParams: zTraceStatusQueryParams,
        },
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
