import { defineEndpoint } from "@shared/core";
import { zSubmissionPathParams } from "./schema/inputs.ts";

/** Agent Vault `GET /v1/recipes/submissions/{id}`. */
export default defineEndpoint({
    meta: {
        displayName: "Get Recipe Submission",
        summary: "Check the screening result for a recipe you submitted.",
        description:
            "Returns the verdict on a recipe submitted with POST /v1/recipes, " +
            "using the submission ID from that call. The status reads " +
            "pending, approved, merged, rejected or needs human review, along " +
            "with any screening findings. While a submission is pending, poll " +
            "again rather than resubmitting. It does not search published " +
            "recipes. For that, use GET /v1/recipes.",
        docsUrl: "https://docs.agentvault.io/reference/http-api",
        categories: ["agent-identity"],
        notes: [
            "Returns 404 `not_found` for a submission that does not " +
            "belong to the calling account.",
        ],
    },
    request: { method: "GET", path: "/v1/recipes/submissions/{id}" },
    input: { schema: { pathParams: zSubmissionPathParams } },
});
