import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { pollJob, startJob, stopJob } from "../../schema/job.ts";
import { SUB_ACCOUNT_BINDING } from "../../schema/sub-account.ts";
import { zValidateBatchBody } from "./schema/inputs.ts";

/**
 * /validate-batch: `POST /v1/jobs/validate`, as an async run. The run is
 * the job: schema/job.ts holds the start, poll and stop it shares with
 * /enrich-batch.
 *
 * BILLING: 1 credit per place, as `POST /v1/validate` charges. The
 * estimate is the places sent; the settle is the job's
 * `progress.succeeded`, so failed rows are free. A refused submit bills 0.
 */
export default defineEndpoint({
    meta: {
        displayName: "Validate Places (Batch)",
        summary:
            "Check whether up to 10,000 places exist and are open, as one job.",
        description:
            "Validate 1 to 10,000 places as one VOYGR job. Send each " +
            "place's name with an address or coordinates. The run lasts " +
            "as long as the job and completes with the job's status: " +
            "`progress` counts the rows processed, succeeded and failed, " +
            "and `results.files[]` links to the results. The file is " +
            "gzipped JSON Lines, one result per place in input order, " +
            "each shaped like a single validation, with " +
            "`existence_confidence` and `operational_status`. Stopping " +
            "the run cancels the job.",
        docsUrl: "https://api.voygr.tech/docs",
        categories: ["maps"],
        notes: [
            "Billed 1 credit for each place validated. Failed rows are " +
            "free, and a refused job costs nothing.",
            "The download link expires in about 15 minutes. Read the job " +
            "with voygr#get-job and its `batch_id` for a fresh link.",
            "Stopping the run cancels the job. Rows already processed " +
            "stay billed and downloadable; the rest cost nothing.",
        ],
    },
    endpoint: "/validate-batch",
    request: { method: "POST", path: "/v1/jobs/validate" },
    input: { schema: { body: zValidateBatchBody } },
    resources: { uses: [SUB_ACCOUNT_BINDING] },
    timeouts: { requestMs: 30_000, pollMs: 30_000, runMs: 86_400_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            label: "credits",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: ({ data }) => ({
            counts: { CREDIT: data.input.body.pois.length },
        }),
        evidence: ({ data, utils }) => ({
            counts: {
                CREDIT: utils.json.optionalNum(
                    data.output,
                    "$.progress.succeeded",
                ) ?? 0,
            },
        }),
    },
    lifecycle: { start: startJob, poll: pollJob, stop: stopJob },
});
