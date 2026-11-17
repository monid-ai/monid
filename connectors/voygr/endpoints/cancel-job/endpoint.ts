import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zBatchPathParams } from "../../schema/job.ts";
import { SUB_ACCOUNT_BINDING } from "../../schema/sub-account.ts";

/**
 * /cancel-job: `DELETE /v1/jobs/{batch_id}`. Free: the request itself
 * bills nothing. The provider relay adds `X-Sub-Account`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Cancel Job",
        summary: "Cancel a queued or running batch job.",
        description:
            "Cancel a validate or enrich job by its `batch_id`. The answer " +
            "is the job's `batch_id` and `status`.",
        docsUrl: "https://api.voygr.tech/docs",
        categories: ["maps"],
        notes: [
            "Cancelling is free. Rows already processed stay billed and " +
            "downloadable with voygr#get-job; the rest cost nothing.",
        ],
    },
    endpoint: "/cancel-job",
    request: { method: "DELETE", path: "/v1/jobs/{batch_id}" },
    input: { schema: { pathParams: zBatchPathParams } },
    resources: { uses: [SUB_ACCOUNT_BINDING] },
    usage: { model: { kind: UsageModelKind.FREE } },
});
