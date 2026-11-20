import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCoverLettersBody } from "./schema/inputs.ts";

/**
 * POST /v1/cover-letters — a one-page cover letter for one job. Flat $0.01,
 * charged by Worklittle only when a letter comes back; errors and failed
 * writes are free (`GET /v1/pricing`, 2026-10-29).
 *
 * ASYNC, with the SAME lifecycle as worklittle#resumes — byte-identical
 * source, so start and poll intern to the resume's fnTable entries (asserted
 * in the test): `async: true` submit with `Idempotency-Key: {runId}`, then
 * `GET /v1/documents/{id}` until `done` or `failed`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Write Tailored Cover Letter",
        summary:
            "Write a one-page cover letter for a specific job from the candidate's own resume. $0.01.",
        description: "Write a hiring-manager-ready, one-page cover letter " +
            "for one job from the candidate's real background: it reads " +
            "the job's posting (by `job_id` from worklittle#jobs/search, or `job_context` / `company` + `role` " +
            "for a job elsewhere) and connects the candidate's actual " +
            "experience from `resume_text` (or an `applicant_id`'s saved " +
            "resume) to what the role asks for. Returns HTML plus a PDF by " +
            "default, or DOCX on request, as base64 files ready to attach. " +
            "It never invents experience or leaves placeholders: with too " +
            "little to work from it fails for free — send `draft: true` " +
            "for a draft that marks gaps as [ ]. It writes the letter " +
            "only; it does not send it or apply. Pair it with " +
            "worklittle#resumes using the same input for the tailored " +
            "resume. $0.01 per letter returned; failures are free.",
        docsUrl: "https://docs.worklittle.com/jobs/api/create-cover-letters",
        categories: ["jobs"],
        notes: [
            "Send resume_text or applicant_id for a ready letter; without " +
            "the candidate's facts, use draft: true.",
            "Send job_id, or job_context / company + role, so the letter " +
            "names the employer and role.",
            "Writing takes about 30 seconds; the run polls until the " +
            "document is ready.",
        ],
    },
    endpoint: "/cover-letters",
    request: { method: "POST", path: "/v1/cover-letters" },
    input: {
        schema: {
            body: zCoverLettersBody.extend({
                formats: zCoverLettersBody.shape.formats.unwrap().min(1)
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
