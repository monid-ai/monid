import { defineProvider, presets } from "@shared/core";

/**
 * Omneky (omneky.com) — brand-aligned image and video ad generation.
 *
 * Asynchronous REST API at `https://api.omneky.com/api/v1/external-api`,
 * auth `X-API-Key` (`sk-omn-api01-…`, issued from the Omneky dashboard).
 * Both creation endpoints answer `202 {job_id, type, credits_used}` and run
 * in the background; the shared `GET /jobs/{job_id}` reports `PENDING` /
 * `PROCESSING` / `SUCCESS` / `FAILED`. Jobs are private to the key that
 * created them, so the job-status read is NOT exposed as its own endpoint —
 * it is only used by this provider's poll, against the job this run created.
 *
 * Billing: Omneky draws from one prepaid credit balance shared by its
 * platform and API, and reserves a job's credits at submit (`credits_used`
 * on the 202). The status body carries no meter, so there is no
 * `usage.consolidate`; each endpoint declares its rate from Omneky's
 * published rate card (www.omneky.com/api-docs#billing) and the derived
 * fold settles. A FAILED job settles 0.
 *
 * Published rate card, and where each line lives in this connector:
 *   - Image Generation, 1K quality ............ 5   → /v1/image-ad (1K)
 *   - Image Generation, 4K quality ............ 10  → /v1/image-ad (4K)
 *   - Product Animation Video with sound ...... 10  → /v1/video-ad
 *   - Image Edit or Upscale (edit, upscale to 4K, copy & resize) 5,
 *     Image Layering 10, Short Commercial 30, AI Avatar Video without /
 *     using product 15 / 20, Long-form Avatar Scripted Video Standard/Fast
 *     75 and Pro 60, Long-form Non-UGC Scripted Video (Pro) 60, Single
 *     Scene Regeneration 20, Clone a winning video 5/sec, Edit a video
 *     2/sec, Video Auto-Splicing free, AI Creative Performance Insights
 *     1 per image ad / 2 per video ad, ad-account connections free —
 *     platform features with no external-API endpoint, so not exposed.
 * Image pricing is per ad; the vendor's `no_of_ads` batch (1–10 ads per
 * request) is not exposed, so one run is one ad. The published docs state
 * no credit-to-currency rate.
 */
export default defineProvider({
    name: "omneky",
    meta: {
        displayName: "Omneky",
        summary: "Generate brand-aligned image and video ads from a URL.",
        description: "Omneky generates on-brand advertising creative. Give " +
            "it a brand website (and optionally a product page, product " +
            "images, colors, fonts and copy) and it extracts the brand " +
            "identity, writes an ad concept, and renders a finished image " +
            "ad or a short multi-scene product video ad. Jobs are " +
            "asynchronous; Monid submits the job, polls until it finishes, " +
            "and returns the finished job with its media URL.",
        homepageUrl: "https://www.omneky.com",
        docsUrl: "https://www.omneky.com/api-docs",
        categories: ["image-generation", "video-generation"],
        notes: [
            "Generation is asynchronous and slow: image ads typically take " +
            "several minutes, video ads longer. Monid polls until the job " +
            "reaches SUCCESS or FAILED.",
            "A FAILED job (the `error` field says why) settles at zero.",
            "Image URLs passed in (logos, product photos, reference ads) " +
            "must be publicly reachable.",
        ],
    },
    auth: { inject: presets.auth.header("X-API-Key") },
    request: { baseUrl: "https://api.omneky.com/api/v1/external-api" },
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
            const jobId = utils.json.optionalGet(res.body, "$.job_id");
            if (typeof jobId !== "string" || jobId === "") {
                throw Object.assign(
                    new Error("Omneky submit returned no job_id"),
                    { retriable: false },
                );
            }
            return {
                kind: "RUNNING",
                state: { externalRunId: jobId },
            };
        },
        poll: async ({ data, utils, logger }) => {
            const jobId = data.lifecycle.state.externalRunId;
            if (jobId === undefined) {
                throw Object.assign(
                    new Error("Omneky poll without externalRunId in state"),
                    { retriable: false },
                );
            }
            const res = await utils.http({
                method: "GET",
                path: "/api/v1/external-api/jobs/" + encodeURIComponent(jobId),
            });
            if (res.status < 200 || res.status >= 300) {
                throw new Error(
                    "Omneky job status query returned " + String(res.status),
                );
            }
            const status = utils.json.optionalGet(res.body, "$.status");
            if (status === "PENDING" || status === "PROCESSING") {
                return {
                    kind: "RUNNING",
                    state: { externalRunId: jobId, stage: status },
                };
            }
            if (status === "FAILED") {
                logger.warn("Omneky job failed", { jobId });
                return {
                    kind: "COMPLETED",
                    httpStatus: 500,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            if (status !== "SUCCESS") {
                logger.warn(
                    "Omneky job status unrecognized — treating as in flight",
                    { jobId, status: String(status) },
                );
                return { kind: "RUNNING" };
            }
            return {
                kind: "COMPLETED",
                httpStatus: 200,
                providerHttpStatus: res.status,
                output: res.body,
            };
        },
    },
    usage: {
        credits: {
            default: {
                label: "Omneky credits",
                description:
                    "Credits drawn from the Omneky account's prepaid balance.",
            },
        },
    },
});
