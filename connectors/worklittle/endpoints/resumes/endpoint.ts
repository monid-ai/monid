import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zResumesBody } from "./schema/inputs.ts";

/**
 * POST /v1/resumes — a one-page resume tailored to one job. Flat $0.01,
 * charged by Worklittle only when a resume comes back; errors and failed
 * writes are free (`GET /v1/pricing`, 2026-10-29).
 *
 * ASYNC. Writing takes ~30 s synchronously, longer than a comfortable
 * request budget, so `start` always sends `async: true`: Worklittle answers
 * `202 {id, status: "working"}` at once and `poll` reads
 * `GET /v1/documents/{id}` until `done` or `failed`. A 200 on the submit is
 * also terminal — the document itself, either a replay of a finished
 * document for the same Idempotency-Key or a deployment without the async
 * queue.
 *
 * EVERY SUBMIT CARRIES `Idempotency-Key: {runId}` (design D34; the orbit
 * posture): a repeated key returns the first finished document and is not
 * charged again.
 *
 * The lifecycle source is shared byte-for-byte with worklittle#cover-letters
 * (one fnTable entry each for start and poll); nothing endpoint-specific is
 * hardcoded — the submit is `utils.request()` against this doc's own
 * compiled request, the poll path is the same for both document kinds.
 */
export default defineEndpoint({
    meta: {
        displayName: "Write Tailored Resume",
        summary:
            "Write a one-page resume tailored to a specific job from the candidate's own resume. $0.01.",
        description: "Rewrite a candidate's real resume into a " +
            "hiring-manager-ready resume tailored to one job: it reads the " +
            "job's posting (by `job_id` from worklittle#jobs/search, or described inline in `job_context`), " +
            "works the posting's keywords into the candidate's actual " +
            "experience, and rewrites until it fits exactly one page (two " +
            "full pages for a long career). Returns HTML plus a PDF by " +
            "default, or DOCX on request, as base64 files ready to attach. " +
            "It uses only facts present in `resume_text` (or the saved " +
            "resume of an `applicant_id`) and never invents employers, " +
            "titles, dates or skills: with too little to work from it fails " +
            "for free rather than padding — send `draft: true` for a draft " +
            "that marks gaps as [ ]. It writes documents only; it does not " +
            "apply to the job or save anything to a profile. For the " +
            "matching letter, send the same input to " +
            "worklittle#cover-letters. $0.01 per resume returned; failures " +
            "are free.",
        docsUrl: "https://docs.worklittle.com/jobs/api/create-resumes",
        categories: ["jobs"],
        notes: [
            "Send resume_text or applicant_id. Without either, a ready " +
            "resume fails (400, free) because there are no facts to write " +
            "from; draft: true writes a skeleton with [ ] gaps instead.",
            "Send job_id, or job_context / company + role, to tailor to a " +
            "job. Without a target the resume is a general rewrite.",
            "Writing takes about 30 seconds; the run polls until the " +
            "document is ready.",
        ],
    },
    endpoint: "/resumes",
    request: { method: "POST", path: "/v1/resumes" },
    input: {
        schema: {
            body: zResumesBody.extend({
                formats: zResumesBody.shape.formats.unwrap().min(1)
                    .optional(),
            }).strict(),
        },
    },
    /** ~30 s to write; queue wait on top. Five minutes is the whole-run
     *  budget; Worklittle keeps a document job for 24 h. */
    timeouts: { requestMs: 30_000, runMs: 300_000, pollMs: 5_000 },
    lifecycle: {
        start: async ({ data, utils }) => {
            const res = await utils.request({
                headers: {
                    ...data.request.headers,
                    "Idempotency-Key": data.run.runId,
                },
                // The validated body as the wire JSON (absent optionals
                // dropped), always asking for the async 202.
                body: {
                    ...JSON.parse(JSON.stringify(data.input.body ?? {})),
                    async: true,
                },
            });
            // A non-2xx submit is data (zero usage); a 200 is the finished
            // document itself (Idempotency-Key replay, or no async queue).
            if (res.status === 200) {
                // the finished document: it must carry a file, as on poll
                const files = ["$.html", "$.pdf_base64", "$.docx_base64"].map((
                    path,
                ) => utils.json.optionalGet(res.body, path));
                const made = files.some((file) =>
                    typeof file === "string" && file !== ""
                );
                return {
                    kind: "COMPLETED",
                    httpStatus: made ? 200 : 502,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            if (res.status !== 202) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const id = utils.json.optionalGet(res.body, "$.id");
            if (typeof id !== "string" || id === "") {
                throw Object.assign(
                    new Error("Worklittle accepted the document without an id"),
                    { retriable: false },
                );
            }
            return { kind: "RUNNING", state: { externalRunId: id } };
        },
        poll: async ({ data, utils, logger }) => {
            const id = data.lifecycle.state.externalRunId;
            if (id === undefined) {
                throw Object.assign(
                    new Error("Worklittle document poll without externalRunId"),
                    { retriable: false },
                );
            }
            const res = await utils.http({
                method: "GET",
                path: "/v1/documents/" + encodeURIComponent(id),
            });
            if (res.status === 408 || res.status === 429 || res.status >= 500) {
                // The status LOOKUP failed; the document keeps being written.
                logger.warn("worklittle document status lookup transient", {
                    id,
                    status: res.status,
                });
                return { kind: "RUNNING", pollAfterMs: 10_000 };
            }
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const status = utils.json.optionalGet(res.body, "$.status");
            if (status === "working" || status === "running") {
                return { kind: "RUNNING" };
            }
            if (status === "failed") {
                // The job's own HTTP status is not in the poll body, only
                // its error code: map the codes Worklittle's error helpers
                // emit back to their statuses; anything else is ours (500).
                const code = utils.json.optionalGet(res.body, "$.error.code");
                const statuses: Record<string, number> = {
                    BAD_REQUEST: 400,
                    UNAUTHORIZED: 401,
                    PAYMENT_REQUIRED: 402,
                    FORBIDDEN: 403,
                    NOT_FOUND: 404,
                    NOT_ACCEPTABLE: 406,
                    CONFLICT: 409,
                    RATE_LIMITED: 429,
                    QUOTA_EXCEEDED: 429,
                    SERVICE_UNAVAILABLE: 503,
                };
                return {
                    kind: "COMPLETED",
                    httpStatus: typeof code === "string" &&
                            statuses[code] !== undefined
                        ? statuses[code]
                        : 500,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            if (status !== "done") {
                logger.warn(
                    "worklittle document status unrecognized — still polling",
                    { id, status: String(status) },
                );
                return { kind: "RUNNING" };
            }
            const files = ["$.html", "$.pdf_base64", "$.docx_base64"].map((
                path,
            ) => utils.json.optionalGet(res.body, path));
            const made = files.some((file) =>
                typeof file === "string" && file !== ""
            );
            return {
                kind: "COMPLETED",
                httpStatus: made ? 200 : 502,
                providerHttpStatus: res.status,
                output: res.body,
            };
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "document",
            consumes: { credit: "default", amount: 0.01 },
        },
    },
});
