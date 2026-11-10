import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { enrichBatchCredits } from "../../schema/enrich-cost.ts";
import { pollJob, startJob, stopJob } from "../../schema/job.ts";
import { SUB_ACCOUNT_BINDING } from "../../schema/sub-account.ts";
import { zEnrichBatchBody } from "./schema/inputs.ts";

/**
 * /enrich-batch: `POST /v1/jobs/enrich`, as an async run. The run is the
 * job: schema/job.ts holds the start, poll and stop it shares with
 * /validate-batch. The start sends each place with the shared options.
 *
 * BILLING (schema/enrich-cost.ts): one row costs what one voygr#enrich
 * request with these options costs. The estimate is places × that price;
 * the settle is the job's `progress.succeeded` × that price, so failed
 * rows are free. A refused submit bills 0.
 */
export default defineEndpoint({
    meta: {
        displayName: "Enrich Places (Batch)",
        summary:
            "Enrich up to 10,000 places with the same attributes, as one job.",
        description:
            "Enrich 1 to 10,000 places as one VOYGR job. List the places " +
            "in `places`; the attributes and checks you choose apply to " +
            "every place, as in voygr#enrich. The run lasts as long as the " +
            "job and completes with the job's status: `progress` counts " +
            "the rows processed, succeeded and failed, and " +
            "`results.files[]` links to the results. The file is gzipped " +
            "JSON Lines, one result per place in input order. VOYGR also " +
            "researches a standard attribute the quick extraction leaves " +
            "empty, at no extra charge. Rows that need it take minutes; " +
            "the rest take seconds. Stopping the run cancels the job.",
        docsUrl: "https://api.voygr.tech/docs",
        categories: ["maps"],
        notes: [
            "Each row that succeeds is billed what one voygr#enrich " +
            "request with these options costs: 1 credit if you ask for " +
            "any standard attribute, plus 1 per research field, plus 1 " +
            "for `verify_name` or `verify_address` and 1 for " +
            "`verify_registered_address`. `owners` and `key_people` cost " +
            "2, plus 1 per contact in `include`. Failed rows are free, and " +
            "a refused job costs nothing.",
            "The charge counts each succeeded row at the full price of its " +
            "options. VOYGR may charge some rows less.",
            "Every place gets the same attributes and checks. To ask " +
            "different things of different places, run separate jobs.",
            "The download link expires in about 15 minutes. Read the job " +
            "with voygr#get-job and its `batch_id` for a fresh link.",
            "Stopping the run cancels the job. Rows already processed " +
            "stay billed and downloadable; the rest cost nothing.",
        ],
    },
    endpoint: "/enrich-batch",
    request: { method: "POST", path: "/v1/jobs/enrich" },
    input: { schema: { body: zEnrichBatchBody } },
    resources: { uses: [SUB_ACCOUNT_BINDING] },
    timeouts: { requestMs: 30_000, pollMs: 30_000, runMs: 86_400_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            label: "credits",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: enrichBatchCredits,
        evidence: enrichBatchCredits,
    },
    lifecycle: { start: startJob, poll: pollJob, stop: stopJob },
});
