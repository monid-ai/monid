import { defineProvider } from "@shared/core";
import { zCreatifyCredentials } from "./schema/auth.ts";

/**
 * Creatify (creatify.ai) — video generation for advertising, as a public
 * API at `https://api.creatify.ai`: Boreal-H3 (ad clips with native audio)
 * and Aurora (lip-synced talking avatars from one image and one audio
 * track). Submitted by Creatify.
 *
 * ONE job protocol for every endpoint, so the lifecycle lives ONCE here:
 *   - start: `POST /api/<product>/` answers 201 with the job row, whose
 *     `id` is the handle; a non-2xx (validation 400, no credits, access
 *     403, rate limit 429) is DATA — nothing was queued or charged.
 *   - poll: `GET /api/<product>/<id>/` — the detail route is the create
 *     route plus the id, derived from the compiled request so the fn is
 *     byte-identical for every endpoint and interns to one entry. A
 *     non-2xx on OUR poll THROWS (retriable): the job is still rendering
 *     and charged, so a transient blip must not abandon it. `pending`,
 *     `in_queue` and `running` are in flight; `done` completes with the
 *     CDN mp4 at `video_output` (or null when the caller's
 *     `output_upload_url` took delivery); `failed` and `rejected` are
 *     terminal failures that Creatify refunds — synthesized 500 / 422,
 *     zero-billed by the engine.
 *   - no stop: a queued render cannot be cancelled through the API.
 *
 * BILLING (design D27): every job row carries `credits_used`, the credits
 * Creatify actually charged, so the provider `usage.consolidate` lifts it
 * as the vendor's claim and each endpoint's rate card is the per-run
 * cross-check. The pool is Creatify API credits — the account's own
 * denomination; the published pay-as-you-go price is USD 0.15 per credit.
 */
export default defineProvider({
    name: "creatify",
    meta: {
        displayName: "Creatify",
        summary:
            "Video generation for ads: Boreal-H3 clips with native audio, and Aurora lip-synced talking avatars from one image and one audio track.",
        description: "Creatify's video models for advertising, as an " +
            "API. Boreal-H3 renders 1-15 second ad clips with native " +
            "audio from a text prompt, a first (and last) frame, or up " +
            "to nine reference images plus reference video and audio " +
            "for consistent characters and products. Aurora turns one " +
            "portrait image and one speech track into a lip-synced " +
            "talking-avatar video — UGC-style ads, spokesperson and " +
            "product-demo videos — with Aurora 2.0 adding resolutions up " +
            "to 2K. Every run is asynchronous: the request queues a " +
            "render and the run polls it to completion, typically 1-5 " +
            "minutes. Output is an MP4 on Creatify's CDN. Billed per " +
            "second of delivered video in Creatify API credits (1 credit " +
            "= USD 0.15); failed renders are refunded and cost nothing.",
        homepageUrl: "https://creatify.ai",
        docsUrl: "https://docs.creatify.ai",
        categories: ["video-generation"],
        /** Caveats true of EVERY Creatify endpoint; endpoint notes
         *  concatenate after these. */
        notes: [
            "Every endpoint is asynchronous: the request queues a render " +
            "and the run polls it; renders typically take 1-5 minutes " +
            "(longer for 2K and long audio).",
            "Media inputs must be public http(s) URLs Creatify can fetch " +
            "server-side when the job is created; an unreachable or " +
            "non-media URL is refused up front and costs nothing.",
            "The output is an MP4 at a cdn.creatify.ai URL with no expiry, " +
            "unless ttl_days (1-7) is set or output_upload_url delivers " +
            "the file to your own storage (then video_output is null).",
            "Billing is per second of delivered video in Creatify API " +
            "credits (1 credit = USD 0.15 at the published pay-as-you-go " +
            "rate); failed and rejected renders are refunded and settle " +
            "at zero.",
            "Job creation is rate limited to 50 requests per minute per " +
            "account; a request past the limit answers 429 and costs " +
            "nothing.",
        ],
    },
    auth: {
        /** Both fields, one credential; the pair rides as two headers on
         *  every request (`Authorization: Bearer <key>&<id>` is an
         *  accepted alias, but the headers are the documented form). */
        credentials: zCreatifyCredentials,
        inject: ({ data }) => ({
            ...data.request,
            headers: {
                ...data.request.headers,
                "X-API-ID": data.params.apiId,
                "X-API-KEY": data.params.apiKey,
            },
        }),
    },
    request: { baseUrl: "https://api.creatify.ai" },
    // Job creation copies the inputs into Creatify storage and probes the
    // audio length before answering, so the create call gets a full
    // minute; a 2K reference render or a 5-minute Aurora track can take
    // well over ten minutes end to end; poll every 10 s.
    timeouts: { requestMs: 60_000, runMs: 1_800_000, pollMs: 10_000 },
    lifecycle: {
        start: async ({ utils, logger }) => {
            // the DEFAULT RELAY: method/url/headers from the compiled
            // request, body from the caller input (after toRequest pinned
            // the model) — the body IS the public API's wire shape
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                // validation 400, credits/access 403, rate limit 429: no
                // job was queued and nothing was charged — DATA
                logger.warn(
                    "creatify job creation refused — returning as data",
                    { status: res.status },
                );
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const jobId = utils.json.optionalGet(res.body, "$.id");
            if (typeof jobId !== "string" || jobId === "") {
                // a 2xx without a job id violates the API's own contract;
                // retrying cannot fix it
                throw Object.assign(
                    new Error("Creatify job creation returned no id"),
                    { retriable: false },
                );
            }
            const status = utils.json.optionalGet(res.body, "$.status");
            return {
                kind: "RUNNING",
                state: {
                    externalRunId: jobId,
                    ...(typeof status === "string" ? { stage: status } : {}),
                },
            };
        },
        poll: async ({ data, utils, logger }) => {
            const jobId = data.lifecycle.state.externalRunId;
            if (jobId === undefined) {
                throw Object.assign(
                    new Error("creatify poll without externalRunId in state"),
                    { retriable: false },
                );
            }
            // the detail route is the create route plus the job id —
            // `/api/boreal/<id>/`, `/api/aurora/<id>/` — read off the
            // compiled request so every endpoint shares this one fn
            const createPath = data.request.url.replace(
                /^https?:\/\/[^/]+/,
                "",
            );
            const res = await utils.http({
                method: "GET",
                path: createPath + encodeURIComponent(jobId) + "/",
            });
            if (res.status < 200 || res.status >= 300) {
                // OUR poll failed while the render is very likely still
                // running — and charged. Throw (retriable) rather than
                // settle, so a blip does not abandon a paid job.
                throw new Error(
                    "Creatify job query returned " + String(res.status),
                );
            }
            const status = utils.json.optionalGet(res.body, "$.status");
            if (
                status === "pending" || status === "in_queue" ||
                status === "running"
            ) {
                return {
                    kind: "RUNNING",
                    state: { externalRunId: jobId, stage: status },
                };
            }
            if (status === "failed" || status === "rejected") {
                // terminal: Creatify refunds the charge; `failed_reason`
                // rides in the body. OURS synthesized / THEIRS was a 200.
                logger.warn("creatify job did not complete", {
                    jobId,
                    status,
                });
                return {
                    kind: "COMPLETED",
                    httpStatus: status === "rejected" ? 422 : 500,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            if (status !== "done") {
                // a status we do not know on a 2xx is still in flight,
                // never a success; `runMs` bounds it
                logger.warn(
                    "creatify job status unrecognized — treating as in flight",
                    { jobId, status: String(status) },
                );
                return { kind: "RUNNING" };
            }
            const video = utils.json.optionalGet(res.body, "$.video_output");
            const delivered = utils.json.optionalGet(
                data.input.body ?? {},
                "$.output_upload_url",
            );
            if (
                (typeof video !== "string" || video === "") &&
                typeof delivered !== "string"
            ) {
                // done without a file and no caller-side delivery: a
                // contract violation, not a success
                logger.warn("creatify job done without video_output", {
                    jobId,
                });
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            return { kind: "COMPLETED", httpStatus: 200, output: res.body };
        },
        // No stop: the API exposes no cancel for a queued render.
    },
    usage: {
        /** THE credit system (design D26): Creatify's API credit, the unit
         *  every job row reports in `credits_used`. */
        credits: {
            default: {
                label: "Creatify API credits",
                description: "API credits drawn from the Creatify API " +
                    "account; 1 credit = USD 0.15 at the published " +
                    "pay-as-you-go rate.",
            },
        },
        /** The vendor's OWN claim (design D27): `credits_used` on the
         *  settled job row is what Creatify charged, so it is lifted out
         *  of the payload as the bill; the endpoint rate cards become the
         *  per-run cross-check (boreal-h3 rounds the total up to the next
         *  half credit, which no rate algebra expresses, so its runs
         *  carry a small `mismatch.derived` by design). Only a `done` job
         *  claims — a refunded failure reports its charge as 0 anyway,
         *  and the engine zero-bills every non-2xx envelope. */
        consolidate: ({ data, utils }) => {
            const status = utils.json.optionalGet(data.output, "$.status");
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.credits_used",
            );
            const credits = status === "done" && typeof value === "number" &&
                    value > 0
                ? value
                : undefined;
            return {
                credits: {
                    ...(credits !== undefined ? { default: credits } : {}),
                },
                output: rest,
            };
        },
    },
});
