import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zBatchPathParams } from "../../schema/job.ts";
import { SUB_ACCOUNT_BINDING } from "../../schema/sub-account.ts";

/**
 * /get-job: `GET /v1/jobs/{batch_id}`. Free. The provider relay adds
 * `X-Sub-Account`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Job",
        summary:
            "Read a batch job's status, progress and a fresh download link.",
        description:
            "Read a validate or enrich job by its `batch_id`: its status " +
            "(queued, running, completed, failed or cancelled), `progress` " +
            "and ETA. Once the job has completed, `results.files[]` links " +
            "to the results, a gzipped JSON Lines file with one result per " +
            "place in input order.",
        docsUrl: "https://api.voygr.tech/docs",
        categories: ["maps"],
        notes: [
            "Reading a job is free.",
            "The download link expires in about 15 minutes. Every read " +
            "returns a fresh one.",
            "A job from another workspace answers 404, like one that does " +
            "not exist.",
        ],
    },
    endpoint: "/get-job",
    request: { method: "GET", path: "/v1/jobs/{batch_id}" },
    input: { schema: { pathParams: zBatchPathParams } },
    resources: { uses: [SUB_ACCOUNT_BINDING] },
    usage: { model: { kind: UsageModelKind.FREE } },
});
