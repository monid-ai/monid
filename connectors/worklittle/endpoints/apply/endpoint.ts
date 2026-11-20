import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import type { Json } from "@shared/core";
import { z } from "zod";
import {
    zApplyBatchExistingBody,
    zApplyBatchNewBody,
} from "./schema/inputs.ts";

const bounded = {
    job_ids: zApplyBatchNewBody.shape.job_ids.min(1).max(10),
    max_per_company: zApplyBatchNewBody.shape.max_per_company.unwrap()
        .min(1).max(10).optional(),
};

/** `{ "test": true }` alone: Worklittle's free practice run (no applicant,
 *  no job, nothing opened, stored or sent). */
const zPracticeBody = z.strictObject({
    test: z.literal(true).describe(
        "Free practice run: nothing opens, nothing is sent or billed.",
    ),
});

const zJobRow = z.strictObject({
    job_id: z.string(),
    ok: z.boolean(),
    session_id: z.string().nullable(),
    status: z.string().nullable(),
    already_applied: z.boolean(),
    error_code: z.string().nullable(),
    error_message: z.string().nullable(),
});
/**
 * POST /v1/apply with `job_ids` (= /v1/apply/batch) — apply AND SUBMIT one
 * person to one to ten jobs. $0.20 per application whose status is
 * awaiting_input, awaiting_submit, completed or stopped (Worklittle's charged
 * statuses; once per person per job). cancelled, failed, refusals,
 * already-applied and `test` are free.
 *
 * ASYNC. Worklittle's batch call only STARTS the applications (one
 * `handlePublicStartApplyWithAi` per job, in order) and answers per-job
 * `{job_id, ok, session_id, status, already_applied | error}`; no outcome
 * exists yet. So `start` records one compact row per job in state and
 * `poll` reads `GET /v1/apply/{id}` for every application still queued or
 * running, until none is. The output is the batch summary with each job's
 * FINAL status.
 *
 * `Idempotency-Key: {runId}:submit` — Worklittle derives `<key>:<job_id>`
 * per job, so a retried start converges on the applications the first
 * attempt made. `use_profile: false` always (shared key).
 *
 * BILLING. Evidence counts jobs whose final status is one Worklittle
 * charges; each is $0.20 (Monid's key is a company key: always the
 * standard price).
 */
export default defineEndpoint({
    meta: {
        displayName: "Apply to Jobs",
        summary:
            "Apply and submit a person to 1–10 jobs in Worklittle's cloud, automatically. $0.20 per application.",
        description: "Applies and submits for the person in Worklittle's " +
            "cloud, automatically: for each `job_id` a browser opens the " +
            "employer's own application form, fills every field from the " +
            "person's applicant profile, tailors and attaches their " +
            "resume, writes any cover letter the form calls for, and " +
            "submits. One job or up to ten in one call; one failing " +
            "(closed, not applyable, already applied, a limit) never " +
            "stops the others. The run returns when every application is " +
            "done, with one row per job: its `session_id`, final " +
            "`status` (normally completed) or the error that refused it. " +
            "Send the `applicant_id` from worklittle#apply/profile, or for a " +
            "first time `applicant` {name, email} plus a resume and SAVE " +
            "the `applicant_id` the output returns. Take `job_ids` from " +
            "worklittle#jobs/search. Check on, answer, approve or stop " +
            "one application with worklittle#apply/{id}; " +
            "worklittle#apply/profile (`action: get`) lists them all. " +
            "`test: true` is a free practice run. $0.20 per application " +
            "that reaches an outcome, once per person per job; failures " +
            "are free.",
        docsUrl: "https://docs.worklittle.com/jobs/api/apply-for-jobs",
        categories: ["jobs"],
        notes: [
            "Apply only for a person who wants you to, with their own " +
            "name, email and resume.",
            "Jobs refused at start (410 JOB_CLOSED, " +
            "409 COMPANY_LIMIT_REACHED, already applied) come back as " +
            "`ok: false` or `already_applied: true` rows and cost nothing.",
            "A job whose site blocks applying (captcha, bot check, form " +
            "unavailable) comes back as an application with status " +
            "`failed`; it costs nothing.",
            "A bad applicant (400, or 409 APPLICANT_EXISTS) stops the " +
            "call after the first job; a 401/403 fails the whole call.",
            "Most applications finish in a few minutes; the run waits up " +
            "to 2 hours. Applications run in Worklittle's cloud, so one " +
            "still running when the run ends keeps going and is not " +
            "cancelled: the run bills only what finished by then, and " +
            "worklittle#apply/{id} shows the rest.",
            "Every application refused or failed comes back as a free " +
            "provider error (ALL_APPLICATIONS_FAILED) listing each reason.",
        ],
    },
    endpoint: "/apply",
    request: { method: "POST", path: "/v1/apply" },
    input: {
        schema: {
            body: z.union([
                zApplyBatchExistingBody.extend(bounded).strict(),
                zApplyBatchNewBody.extend(bounded).strict(),
                zPracticeBody,
            ]).describe(
                "Send applicant_id (a returning person) or applicant + a " +
                    "resume (their first application), plus job_ids. " +
                    '`{ "test": true }` alone is a free practice run.',
            ),
        },
    },
    /** A real browser filling a real employer form, up to ten of them plus
     *  queueing: most finish in minutes, but a slow site or a long form
     *  can take over an hour (Worklittle production, 30 days to
     *  2026-11-20: ~6% of submitted applications ran past 45 minutes).
     *  2 hours covers nearly all of them; past it, `stop` settles what
     *  finished and leaves the rest running upstream. */
    timeouts: { requestMs: 60_000, runMs: 7_200_000, pollMs: 15_000 },
    lifecycle: {
        state: z.strictObject({
            applicant_id: z.string().nullable(),
            jobs: z.array(zJobRow).describe("One compact row per job."),
        }),
        start: async ({ data, utils }) => {
            const res = await utils.request({
                headers: {
                    ...data.request.headers,
                    "Idempotency-Key": data.run.runId + ":submit",
                },
                body: {
                    ...JSON.parse(JSON.stringify(data.input.body ?? {})),
                    use_profile: false,
                },
            });
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            // practice run: Worklittle's own answer, free
            if (!("job_ids" in (data.input.body ?? {}))) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const results = utils.json.optionalGet(res.body, "$.results");
            const applicant = utils.json.optionalGet(
                res.body,
                "$.applicant_id",
            );
            const jobs = (Array.isArray(results) ? results : []).map((
                row,
            ) => {
                const r = row !== null && typeof row === "object" &&
                        !Array.isArray(row)
                    ? row
                    : {};
                const error = r.error !== null &&
                        typeof r.error === "object" &&
                        !Array.isArray(r.error)
                    ? r.error
                    : {};
                return {
                    job_id: typeof r.job_id === "string" ? r.job_id : "",
                    ok: r.ok === true,
                    session_id: typeof r.session_id === "string" &&
                            r.session_id !== ""
                        ? r.session_id
                        : null,
                    status: typeof r.status === "string" ? r.status : null,
                    already_applied: r.already_applied === true,
                    error_code: typeof error.code === "string"
                        ? error.code
                        : null,
                    error_message: typeof error.message === "string"
                        ? error.message
                        : null,
                };
            });
            const state = {
                externalRunId: data.run.runId,
                data: {
                    applicant_id: typeof applicant === "string"
                        ? applicant
                        : null,
                    jobs,
                },
            };
            const live = jobs.some((
                j,
            ) => (j.session_id !== null && !j.already_applied &&
                (j.status === null || j.status === "queued" ||
                    j.status === "running" || j.status === "matched"))
            );
            if (live) return { kind: "RUNNING", state };
            // every job refused or failed: the call failed as a whole (free)
            if (
                jobs.length > 0 &&
                jobs.every((j) =>
                    !j.already_applied && (!j.ok || j.status === "failed")
                )
            ) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: 200,
                    output: {
                        error: {
                            code: "ALL_APPLICATIONS_FAILED",
                            message: "No application went through: " +
                                jobs.map((j) =>
                                    j.job_id + ": " +
                                    (j.error_message ?? j.error_code ??
                                        "failed on Worklittle's side")
                                ).join("; "),
                        },
                        applicant_id: state.data.applicant_id,
                        jobs,
                    } as Json,
                    state,
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: 200,
                providerHttpStatus: res.status,
                output: { applicant_id: state.data.applicant_id, jobs },
                state,
            };
        },
        poll: async ({ data, utils, logger }) => {
            const prior = data.lifecycle.state.data;
            if (prior === undefined) {
                throw Object.assign(
                    new Error("Worklittle batch poll without job state"),
                    { retriable: false },
                );
            }
            const jobs = [];
            for (const job of prior.jobs) {
                const pending = job.session_id !== null &&
                    !job.already_applied &&
                    (job.status === null || job.status === "queued" ||
                        job.status === "running" ||
                        job.status === "matched");
                if (!pending || job.session_id === null) {
                    jobs.push(job);
                    continue;
                }
                const res = await utils.http({
                    method: "GET",
                    path: "/v1/apply/" + encodeURIComponent(job.session_id),
                });
                if (res.status < 200 || res.status >= 300) {
                    // A lookup that failed leaves the row as it was; the
                    // application keeps running upstream.
                    logger.warn("worklittle batch status lookup failed", {
                        session: job.session_id,
                        status: res.status,
                    });
                    jobs.push(job);
                    continue;
                }
                const session = utils.json.optionalGet(res.body, "$.session");
                const s = session !== null && typeof session === "object" &&
                        !Array.isArray(session)
                    ? session
                    : {};
                jobs.push({
                    ...job,
                    status: typeof s.status === "string"
                        ? s.status
                        : job.status,
                    error_message: typeof s.error_message === "string" &&
                            s.error_message !== ""
                        ? s.error_message
                        : job.error_message,
                });
            }
            const state = {
                externalRunId: data.lifecycle.state.externalRunId,
                data: { applicant_id: prior.applicant_id, jobs },
            };
            const live = jobs.some((
                j,
            ) => (j.session_id !== null && !j.already_applied &&
                (j.status === null || j.status === "queued" ||
                    j.status === "running" || j.status === "matched"))
            );
            if (live) return { kind: "RUNNING", state };
            // every job refused or failed: the call failed as a whole (free)
            if (
                jobs.length > 0 &&
                jobs.every((j) =>
                    !j.already_applied && (!j.ok || j.status === "failed")
                )
            ) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: 200,
                    output: {
                        error: {
                            code: "ALL_APPLICATIONS_FAILED",
                            message: "No application went through: " +
                                jobs.map((j) =>
                                    j.job_id + ": " +
                                    (j.error_message ?? j.error_code ??
                                        "failed on Worklittle's side")
                                ).join("; "),
                        },
                        applicant_id: prior.applicant_id,
                        jobs,
                    } as Json,
                    state,
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: 200,
                output: { applicant_id: prior.applicant_id, jobs },
                state,
            };
        },
        /** The run outlived runMs. Applications are NOT cancelled: each is
         *  a real employer application the person asked for, running in
         *  Worklittle's cloud, and it finishes there on its own. Stop reads
         *  every application once more and settles what finished by now
         *  (awaiting_input, awaiting_submit, completed and stopped bill;
         *  cancelled, failed and rows still running bill nothing). Rows still
         *  running come back with their `session_id` for
         *  worklittle#apply/{id}. */
        stop: async ({ data, utils, logger }) => {
            const prior = data.lifecycle.state.data;
            if (prior === undefined) return;
            const jobs = [];
            for (const job of prior.jobs) {
                const pending = job.session_id !== null &&
                    !job.already_applied &&
                    (job.status === null || job.status === "queued" ||
                        job.status === "running" ||
                        job.status === "matched");
                if (!pending || job.session_id === null) {
                    jobs.push(job);
                    continue;
                }
                // A lookup that THROWS (timeout, network) must not lose the
                // rows already read: keep this row as it was and go on.
                let res;
                try {
                    res = await utils.http({
                        method: "GET",
                        path: "/v1/apply/" +
                            encodeURIComponent(job.session_id),
                    });
                } catch (error) {
                    logger.warn("worklittle stop status lookup threw", {
                        session: job.session_id,
                        error: String(error),
                    });
                    jobs.push(job);
                    continue;
                }
                if (res.status < 200 || res.status >= 300) {
                    // A lookup that failed leaves the row as it was; the
                    // application keeps running upstream.
                    logger.warn("worklittle batch status lookup failed", {
                        session: job.session_id,
                        status: res.status,
                    });
                    jobs.push(job);
                    continue;
                }
                const session = utils.json.optionalGet(res.body, "$.session");
                const s = session !== null && typeof session === "object" &&
                        !Array.isArray(session)
                    ? session
                    : {};
                jobs.push({
                    ...job,
                    status: typeof s.status === "string"
                        ? s.status
                        : job.status,
                    error_message: typeof s.error_message === "string" &&
                            s.error_message !== ""
                        ? s.error_message
                        : job.error_message,
                });
            }
            const state = {
                externalRunId: data.lifecycle.state.externalRunId,
                data: { applicant_id: prior.applicant_id, jobs },
            };
            // every job refused or failed: the call failed as a whole (free)
            if (
                jobs.length > 0 &&
                jobs.every((j) =>
                    !j.already_applied && (!j.ok || j.status === "failed")
                )
            ) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: 200,
                    output: {
                        error: {
                            code: "ALL_APPLICATIONS_FAILED",
                            message: "No application went through: " +
                                jobs.map((j) =>
                                    j.job_id + ": " +
                                    (j.error_message ?? j.error_code ??
                                        "failed on Worklittle's side")
                                ).join("; "),
                        },
                        applicant_id: prior.applicant_id,
                        jobs,
                    } as Json,
                    state,
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: 200,
                output: { applicant_id: prior.applicant_id, jobs },
                state,
            };
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "applications",
            description: "applications that reached an outcome that is the " +
                "person's: awaiting_input, awaiting_submit, completed or " +
                "stopped (Worklittle's charged statuses)",
            consumes: { credit: "default", amount: 0.2 },
        },
        /** The hold promises one application per job; a test run nothing. */
        estimate: ({ data }) => ({
            counts: {
                RESULT: data.input.body?.test === true
                    ? 0
                    : data.input.body?.job_ids?.length ?? 0,
            },
        }),
        evidence: ({ data, utils }) => {
            const jobs = utils.json.optionalGet(data.output, "$.jobs");
            const statuses = (Array.isArray(jobs) ? jobs : []).map((job) =>
                job !== null && typeof job === "object" &&
                    !Array.isArray(job) && job.already_applied !== true
                    ? job.status
                    : null
            );
            // Worklittle's public status alone says whether it was charged:
            // these four are; cancelled (stopped before anything was filled
            // in) and failed (anything on Worklittle's side) are free.
            const outcomes = [
                "awaiting_input",
                "awaiting_submit",
                "completed",
                "stopped",
            ];
            const count = data.input.body?.test === true
                ? 0
                : statuses.filter((s) =>
                    typeof s === "string" && outcomes.includes(s)
                ).length;
            return { counts: { RESULT: count } };
        },
    },
});
