import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zStartEnrichJobBody } from "./schema/inputs.ts";

/**
 * `POST /data/people/enrich-jobs` — find emails and phones for up to 100
 * people in one background job.
 *
 * ASYNC. The submit answers `202` with a `jobId`; the lifecycle reads
 * `GET /data/people/enrich-jobs/{jobId}` until the job is `completed`,
 * `stopped` or `failed`, so one monid run returns every row. The read is
 * derived from the doc's own request url, so it stays same-origin and the
 * engine injects the key.
 *
 * THE SUBMIT CARRIES `X-Idempotency-Key: {runId}:submit` — the host-stable
 * run id (design D34). Fuse binds the key to the request body and answers a
 * repeat with the job it already started, so a retried start converges on
 * one job instead of paying for a second.
 *
 * ONE READ-RETRY RULE: a read answering `408`, `429` or any `5xx` is a
 * lookup that failed while the job keeps running and keeps charging its
 * rows, so it holds the run open. `Retry-After` is in SECONDS; it sets the
 * next tick, clamped to [1s, 120s], and is bounded by `runMs` regardless.
 *
 * THE RECEIPT SETTLES IT: the job's `creditsCharged` is the sum Fuse
 * debited for the rows it finished, read by the provider's evidence. A
 * `stopped` or `failed` job settles the same way: the rows it finished
 * come back, charged as Fuse charged them. Each row keeps its own
 * `creditsCharged`, which says which rows those were.
 */
export default defineEndpoint({
    meta: {
        displayName: "Find Emails and Phones in Bulk",
        summary:
            "Find work emails and phones for up to 100 people in one run, charged only for what is found.",
        description: "Find work emails and/or phones for up to 100 " +
            "people in one run. Each person is charged like the single " +
            "lookups, only for the values found. Send `people` (each a " +
            "`linkedinUrl`, or a `name` with a `companyName` or " +
            "`companyDomain`) and `find` (`email`, `phone` or both). The run " +
            "waits for the whole job, a few minutes for 100 people, and " +
            "returns `status` (`completed`, `stopped` or `failed`), `total`, " +
            "`processed`, `found` and `rows` in the order the people were " +
            "sent, each with its `index`, `status` (`found`, `not_found`, or " +
            "`not_identifiable` when the person could not be looked up), " +
            "`email`, `phone`, `linkedinUrl` and `creditsCharged`. A job " +
            "stopped for credits carries `stoppedReason` " +
            "`INSUFFICIENT_CREDITS` and keeps the rows it finished. For one " +
            "person, `fuse#data/people/email` and `fuse#data/people/phone` " +
            "answer in seconds.",
        categories: ["people-enrichment"],
        notes: [
            "`find` names each kind once; a repeated kind answers 422 " +
            "VALIDATION_FAILED.",
            "Rows a job finished are charged even when it stops early or " +
            "fails; rows it never reached are not.",
        ],
    },
    request: { method: "POST", path: "/data/people/enrich-jobs" },
    input: { schema: { body: zStartEnrichJobBody } },
    /** A job of 100 people takes a few minutes, and an account runs one
     *  job at a time, so a job can queue behind another. 30 minutes is the
     *  whole-run budget; a job that outlives it still finishes on Fuse's
     *  side. */
    timeouts: { requestMs: 30_000, runMs: 1_800_000, pollMs: 5_000 },
    lifecycle: {
        start: async ({ data, utils, logger }) => {
            const res = await utils.request({
                headers: {
                    ...data.request.headers,
                    "X-Idempotency-Key": data.run.runId + ":submit",
                },
            });
            if (res.status !== 202) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const jobId = utils.json.optionalGet(res.body, "$.jobId");
            if (typeof jobId !== "string" || jobId === "") {
                throw new Error("Fuse did not return a jobId");
            }
            logger.info("fuse enrich job started", { jobId });
            return { kind: "RUNNING", state: { externalRunId: jobId } };
        },
        poll: async ({ data, utils, logger }) => {
            const jobId = data.lifecycle.state.externalRunId;
            if (jobId === undefined) {
                throw Object.assign(
                    new Error("fuse enrich job poll without externalRunId"),
                    { retriable: false },
                );
            }
            const res = await utils.http({
                method: "GET",
                url: data.request.url + "/" + encodeURIComponent(jobId),
            });
            if (res.status === 408 || res.status === 429 || res.status >= 500) {
                const after = Number(res.headers["retry-after"]);
                const pollAfterMs = Number.isFinite(after) && after > 0
                    ? Math.min(Math.max(after * 1000, 1_000), 120_000)
                    : 15_000;
                logger.warn("fuse enrich job read transient", {
                    jobId,
                    status: res.status,
                    pollAfterMs,
                });
                return { kind: "RUNNING", pollAfterMs };
            }
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const status = utils.json.optionalGet(res.body, "$.status");
            if (status === "pending" || status === "processing") {
                return { kind: "RUNNING" };
            }
            logger.info("fuse enrich job settled", {
                jobId,
                status: String(status),
            });
            return { kind: "COMPLETED", httpStatus: 200, output: res.body };
        },
    },
    usage: {
        /** Metered in Fuse's own credits; the provider's evidence reads the
         *  job's receipt, so a job that found nothing settles zero. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "values found",
            description: "what the job drew, as Fuse's own receipt totals it",
        },
        /** Every person found on every kind asked, at the plan's
         *  `people_email` and `people_phone` prices. */
        estimate: ({ data }) => ({
            counts: {
                CREDIT: data.input.body.people.length *
                    ((data.input.body.find.includes("email") ? 5 : 0) +
                        (data.input.body.find.includes("phone") ? 10 : 0)),
            },
        }),
    },
});
