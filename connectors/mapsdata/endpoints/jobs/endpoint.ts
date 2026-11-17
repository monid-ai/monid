import { z } from "zod";
import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zJobsBody } from "./schema/inputs.ts";

/**
 * `POST /api/v1/jobs` — scrape Google Maps leads for a category and area.
 *
 * ASYNC (design D10/D21). The vendor protocol:
 *   `POST /jobs`                 -> 202 Job {id, status: "queued", ...}
 *   `GET  /jobs/{id}`            -> Job {status, progress, email_count, ...}
 *   `GET  /jobs/{id}/download`   -> {url, expires_at, ...} a 15-minute signed
 *                                   link to the finished CSV on object storage
 *   `POST /jobs/{id}/cancel`     -> cancel
 *
 * The poll follows that chain to the end: on `completed` it asks for the
 * emails-scope CSV link and fetches the file. The link is a different origin
 * (object storage), so the engine sends that request BARE (design D16) —
 * which is exactly what a presigned URL needs, and keeps the bearer key off a
 * third-party host. The CSV is parsed in the fn and returned as rows. The
 * output is bounded by the caller's own `total_limit`.
 *
 * A `dry_run: true` submission answers 200 synchronously with the resolved
 * plan and no job; `start` settles it COMPLETED on the spot, and it bills 0
 * (no leads delivered).
 *
 * `Idempotency-Key` is derived from the host-stable run id, so a retried
 * start replays the original job instead of creating a second scrape.
 */
export default defineEndpoint({
    meta: {
        displayName: "MapsData Lead Scrape",
        summary: "Scrape Google Maps businesses with verified emails for a " +
            "category across states or cities.",
        description: "Scrape every Google Maps business in one to three " +
            "categories across whole regions (`states`) or named `cities` " +
            "in the US, Canada, the UK or Australia, and get back the ones " +
            "with a verified email, as rows: name, email, phone, address, " +
            "city, state, website, domain, rating, review count, " +
            "categories, opening hours, business status, claimed flag and " +
            "Google Maps URL. Businesses without an email are not returned " +
            "and not billed. `total_limit` is required and caps how many " +
            "businesses are scraped; the number of leads returned is " +
            "usually lower, and a sparse area can stop early, which " +
            "`job.stop_reason` explains. `query` must be a canonical Google " +
            "Maps category: resolve free text with " +
            "mapsdata#categories/validate and region names with " +
            "mapsdata#regions before submitting, or send `dry_run: true` to " +
            "check everything for free. A durable job: minutes for a city, " +
            "up to hours for a large state, polled to completion and " +
            "stoppable mid-run. For contacts at companies you already know, " +
            "use a people-enrichment endpoint instead.",
        docsUrl: "https://mapsdata.ai/api/v1/openapi.json",
        categories: ["maps"],
        notes: [
            "Pass either `states` or `cities`; at least one is required. " +
            "`include_variants` only widens single-category queries.",
            "The result is `{job, leads}`. `job.email_count` is the " +
            "billed figure; `leads` holds the same rows as strings, with " +
            "an empty string for a missing value.",
            "A run that outlives the 2-hour budget is cancelled; size " +
            "`total_limit` so a job fits it.",
        ],
    },
    request: { method: "POST", path: "/jobs" },
    input: {
        schema: {
            body: zJobsBody.extend({
                // the vendor mirror is a free string; the four markets
                // MapsData serves are the enforced set (an enum compiles to
                // JSON Schema, a pipe would not)
                country: z.enum(["us", "ca", "uk", "au"]).describe(
                    "One of us, ca, uk, au. The vendor defaults to us.",
                ).optional(),
            }),
        },
    },
    // long-running job: short submit/poll exchanges, a 2-hour run budget,
    // and a slow cadence because a scrape moves in minutes, not seconds
    timeouts: { requestMs: 30_000, runMs: 7_200_000, pollMs: 30_000 },
    lifecycle: {
        start: async ({ data, utils, logger }) => {
            logger.info("submitting mapsdata job", { url: data.request.url });
            const res = await utils.request({
                headers: {
                    ...data.request.headers,
                    "Idempotency-Key": data.run.runId + ":submit",
                },
            });
            if (res.status < 200 || res.status >= 300) {
                // gate rejection (400 bad category / region, 402 allowance
                // spent, 409 queue full, 429 rate limit) — DATA, zero usage
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            if (utils.json.optionalGet(res.body, "$.would_create") === true) {
                // dry run: the resolved plan, no job created
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const jobId = utils.json.optionalGet(res.body, "$.id");
            if (typeof jobId !== "string" || jobId === "") {
                throw new Error("MapsData did not return a job id");
            }
            return { kind: "RUNNING", state: { externalRunId: jobId } };
        },
        poll: async ({ data, utils, logger }) => {
            const jobId = data.lifecycle.state.externalRunId;
            if (jobId === undefined) {
                throw Object.assign(
                    new Error("mapsdata poll without externalRunId in state"),
                    { retriable: false },
                );
            }
            const jobUrl = data.request.url + "/" + encodeURIComponent(jobId);
            const res = await utils.http({ method: "GET", url: jobUrl });
            if (
                res.status === 429 || res.status === 500 ||
                res.status === 502 || res.status === 503 ||
                res.status === 504
            ) {
                // The status LOOKUP failed, not the scrape, which keeps
                // running and keeps delivering leads. Back off; bounded by
                // runMs.
                logger.warn("mapsdata status lookup transient", {
                    jobId,
                    status: res.status,
                });
                return { kind: "RUNNING", pollAfterMs: 60_000 };
            }
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const status = utils.json.optionalGet(res.body, "$.status");
            if (
                status === "queued" || status === "running" ||
                status === "cancelling"
            ) {
                return { kind: "RUNNING" };
            }
            if (status !== "completed") {
                // failed / cancelled (or a status added later): the scrape
                // ended without a deliverable. Shaped like MapsData's own
                // error envelope so the provider fromError reads it.
                const reason = utils.json.optionalGet(
                    res.body,
                    "$.error_message",
                );
                logger.warn("mapsdata job did not complete", {
                    jobId,
                    status: String(status),
                });
                return {
                    kind: "COMPLETED",
                    httpStatus: 500,
                    providerHttpStatus: 200,
                    output: utils.json.merge({}, {
                        error: {
                            code: "job_" + String(status),
                            message: typeof reason === "string" &&
                                    reason !== ""
                                ? reason
                                : "MapsData job " + String(status),
                            details: { job: res.body },
                        },
                    }),
                };
            }
            const job = res.body;
            const hasFile = utils.json.optionalGet(job, "$.downloads.csv");
            const emailCount = utils.json.optionalNum(job, "$.email_count") ??
                0;
            if (hasFile !== true || emailCount === 0) {
                // completed with no email rows: nothing to fetch, nothing
                // billed
                return {
                    kind: "COMPLETED",
                    httpStatus: 200,
                    output: utils.json.merge({}, { job, leads: [] }),
                };
            }
            const link = await utils.http({
                method: "GET",
                url: jobUrl + "/download",
                queryParams: { format: "csv", scope: "emails" },
            });
            if (link.status === 503 || link.status === 429) {
                // the vendor could not mint a signed link right now; the
                // job is finished, so retry soon
                return { kind: "RUNNING", pollAfterMs: 10_000 };
            }
            if (link.status < 200 || link.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: link.status,
                    output: link.body,
                };
            }
            const fileUrl = utils.json.optionalGet(link.body, "$.url");
            if (typeof fileUrl !== "string" || fileUrl === "") {
                throw new Error("MapsData download link carried no url");
            }
            // cross-origin presigned URL: sent bare (D16), no credential
            const file = await utils.http({
                method: "GET",
                url: fileUrl,
                requestMs: 120_000,
            });
            if (file.status === 403 || file.status >= 500) {
                // an expired or flaky link: mint a fresh one next tick
                return { kind: "RUNNING", pollAfterMs: 10_000 };
            }
            if (file.status < 200 || file.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: file.status,
                    output: utils.json.merge({}, {
                        error: {
                            code: "download_failed",
                            message: "Could not fetch the MapsData result " +
                                "file (HTTP " + String(file.status) + ")",
                            details: {},
                        },
                    }),
                };
            }
            if (typeof file.body !== "string") {
                throw new Error("MapsData result file was not CSV text");
            }
            // RFC 4180 parse: quoted fields, doubled quotes, embedded commas
            // and newlines, CRLF or LF, optional UTF-8 BOM.
            const text = file.body.charCodeAt(0) === 0xfeff
                ? file.body.slice(1)
                : file.body;
            const table = [[""]].slice(0, 0);
            let row = [""].slice(0, 0);
            let field = "";
            let quoted = false;
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                if (quoted) {
                    if (ch === '"') {
                        if (text[i + 1] === '"') {
                            field += '"';
                            i++;
                        } else {
                            quoted = false;
                        }
                    } else {
                        field += ch;
                    }
                } else if (ch === '"') {
                    quoted = true;
                } else if (ch === ",") {
                    row.push(field);
                    field = "";
                } else if (ch === "\n" || ch === "\r") {
                    if (ch === "\r" && text[i + 1] === "\n") i++;
                    row.push(field);
                    field = "";
                    table.push(row);
                    row = [""].slice(0, 0);
                } else {
                    field += ch;
                }
            }
            if (field !== "" || row.length > 0) {
                row.push(field);
                table.push(row);
            }
            const headers = table.length > 0 ? table[0] : [];
            const leads = table.slice(1)
                .filter((cells) => !(cells.length === 1 && cells[0] === ""))
                .map((cells) =>
                    Object.fromEntries(
                        headers.map((name, j) => [name, cells[j] ?? ""]),
                    )
                );
            return {
                kind: "COMPLETED",
                httpStatus: 200,
                output: utils.json.merge({}, { job, leads }),
            };
        },
        stop: async ({ data, utils, logger }) => {
            const jobId = data.lifecycle.state.externalRunId;
            if (jobId === undefined) {
                throw Object.assign(
                    new Error("mapsdata stop without externalRunId in state"),
                    { retriable: false },
                );
            }
            const res = await utils.http({
                method: "POST",
                url: data.request.url + "/" + encodeURIComponent(jobId) +
                    "/cancel",
            });
            if (res.status < 200 || res.status >= 300) {
                // 409 job_not_cancellable: it already finished
                logger.warn("mapsdata job cancel failed (ignored)", {
                    jobId,
                    status: res.status,
                });
            }
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "leads with a verified email",
            consumes: { credit: "default", amount: 1 },
        },
        /** `total_limit` caps businesses scraped, and only the subset with
         *  an email bills, so it is a true ceiling. A dry run creates
         *  nothing and bills nothing. */
        estimate: ({ data }) => ({
            counts: {
                "RESULT": data.input.body.dry_run === true
                    ? 0
                    : data.input.body.total_limit,
            },
        }),
        /** The rows actually delivered. */
        evidence: ({ data, utils }) => {
            const leads = utils.json.optionalGet(data.output, "$.leads");
            return {
                counts: { "RESULT": Array.isArray(leads) ? leads.length : 0 },
            };
        },
        /** The vendor's OWN meter (design D27): `job.email_count` is the
         *  figure MapsData bills on. It stays in the output (it is also the
         *  caller's summary), so this reads it rather than plucking it.
         *  Omitted when absent (a dry run), falling back to the fold. */
        consolidate: ({ data, utils }) => {
            const billed = utils.json.optionalNum(
                data.output,
                "$.job.email_count",
            );
            return {
                credits: {
                    ...(billed !== undefined ? { default: billed } : {}),
                },
            };
        },
    },
});
