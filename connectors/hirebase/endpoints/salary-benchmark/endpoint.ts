import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSalaryBenchmarkBody } from "./schema/inputs.ts";

/** POST /v2/jobs/salary-benchmark — queued report, polled to completion. */
export default defineEndpoint({
    meta: {
        displayName: "Salary Benchmark",
        summary: "Benchmark one role's pay against comparable job " +
            "postings: percentiles, sample size and a confidence grade.",
        description: "Build a posted-salary benchmark for one role. Give " +
            "a job title (optionally with years of experience, location, " +
            "remote policy and industry) or the URL of a public job " +
            "posting, and Hirebase finds comparable postings from the " +
            "last 90 days (configurable, up to a year) and returns the " +
            "annual pay distribution (p5 to p95, sample size, currency), " +
            "the typical posted floor and ceiling, the split between " +
            "jobs open now and recently closed, the trend by month, a " +
            "confidence grade driven by sample size and match quality, " +
            "and a sample of up to 25 of the postings behind the " +
            "numbers. Pass salary_range to learn which percentile a " +
            "proposed range sits at, with a verdict. The call waits for " +
            "the report and returns it complete. Suited for setting or " +
            "checking a pay range before posting a job, judging an " +
            "offer, and compensation research. For broad market numbers " +
            "over many roles at once, hirebase#jobs/insights is one " +
            "cheaper, immediate call.",
        docsUrl:
            "https://www.hirebase.org/docs/api-reference/jobs/salary-benchmark",
        categories: ["jobs"],
        notes: [
            "One of public_url or job_title is required.",
            "A report takes about 1 to 2 minutes.",
            "The headline percentiles are at report.market.salary (p5 to " +
            "p95, count, currency); the verdict on a proposed range is at " +
            "report.proposed.",
            "Figures are POSTED salaries from job listings, annualized, " +
            "in the market's own currency (USD in the US, GBP in the " +
            "UK...). They are not survey or payroll data.",
            "A benchmark that fails is not billed.",
        ],
    },
    request: { method: "POST", path: "/jobs/salary-benchmark" },
    timeouts: { requestMs: 30_000, runMs: 600_000, pollMs: 5_000 },
    // "At least one of public_url / job_title" (Hirebase answers 422
    // otherwise): a union of two `.required` arms, so an empty body fails
    // with INVALID_INPUT before the wire. A body carrying both passes.
    input: {
        schema: {
            body: z.union([
                zSalaryBenchmarkBody.required({ public_url: true }),
                zSalaryBenchmarkBody.required({ job_title: true }),
            ]),
        },
    },
    /**
     * WHY THIS ENDPOINT OWNS ITS LIFECYCLE: the POST only QUEUES the
     * report and answers a task `{id, state: "queued"}`; the report is
     * written onto that task, read at `GET /v2/tasks/{id}` once `state`
     * is `finished`. `failed` / `canceled` are terminal and refunded
     * upstream, so they settle as a provider error (zero usage). The
     * task id is the only state kept.
     */
    lifecycle: {
        start: async ({ utils }) => {
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const taskId = utils.json.optionalGet(res.body, "$.id");
            if (typeof taskId !== "string" || taskId === "") {
                throw Object.assign(
                    new Error("Hirebase salary benchmark returned no task id"),
                    { retriable: false },
                );
            }
            return { kind: "RUNNING", state: { externalRunId: taskId } };
        },
        poll: async ({ data, utils }) => {
            const taskId = data.lifecycle.state.externalRunId;
            if (taskId === undefined) {
                throw Object.assign(
                    new Error("Hirebase poll without a task id in state"),
                    { retriable: false },
                );
            }
            const res = await utils.http({
                method: "GET",
                path: "/v2/tasks/" + taskId,
            });
            // a 5xx or a rate limit mid-run is not an answer — keep
            // polling; `runMs` bounds the wait
            if (res.status >= 500 || res.status === 429) {
                return { kind: "RUNNING" };
            }
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const state = utils.json.optionalGet(res.body, "$.state");
            if (state === "finished") {
                return {
                    kind: "COMPLETED",
                    httpStatus: 200,
                    output: res.body,
                };
            }
            if (state === "failed" || state === "canceled") {
                const error = utils.json.optionalGet(res.body, "$.error");
                return {
                    kind: "COMPLETED",
                    httpStatus: state === "canceled" ? 409 : 502,
                    providerHttpStatus: res.status,
                    output: {
                        detail: typeof error === "string" && error !== ""
                            ? error
                            : "Salary benchmark " + String(state),
                        task: res.body,
                    },
                };
            }
            return {
                kind: "RUNNING",
                state: {
                    externalRunId: taskId,
                    ...(typeof state === "string" ? { stage: state } : {}),
                },
            };
        },
    },
    usage: {
        /** 1 unit of the salary-benchmarks allowance per report. */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "benchmark",
            consumes: { credit: "salary_benchmarks", amount: 1 },
        },
    },
    output: {
        /** The finished task wraps the report with queue bookkeeping
         *  (worker, priority, the account's user id). Hand back the
         *  report itself, beside the task id and the resolved input. */
        fromResponse: ({ data, utils }) => ({
            task_id: utils.json.optionalGet(data.output, "$.id") ?? null,
            input: utils.json.optionalGet(data.output, "$.input") ?? null,
            report: utils.json.optionalGet(data.output, "$.result") ?? null,
        }),
    },
});
