import {
    defineProvider,
    type Json,
    presets,
    Unit,
    UsageModelKind,
} from "@shared/core";

/**
 * Topaz Labs (topazlabs.com) — the Video API: upscale, denoise, deblur,
 * deinterlace, colorize, SDR-to-HDR, and frame interpolation. Ported from
 * monid-services `adaptors/topaz` (the video half; the Image API takes a
 * multipart file upload the engine cannot send yet, #170).
 *
 * Every endpoint is the same async job (drill-verified in monid-services,
 * 2026-09-16), so the lifecycle lives HERE and every endpoint inherits it:
 *
 *   start  POST /video/express — the endpoint's `toRequest` builds the body
 *          (source metadata, `source.external` pointing Topaz at the
 *          caller's URL, one `filters[]` model, an explicit `output`)
 *   poll   GET  /video/{id}/status; on `complete`, GET /video/{id} for the
 *          download link and the credit ledger
 *   stop   DELETE /video/{id}
 *
 * Usage is Topaz CREDITS: the model and the output resolution decide how
 * many frames one credit covers, and Topaz commits the real amount in the
 * finished record's `transactions[]` ledger (rates:
 * https://developer.topazlabs.com/video-models, checked 2026-10-22). Each
 * endpoint's estimate applies its models' frames-per-credit rates.
 */
export default defineProvider({
    name: "topaz",
    meta: {
        displayName: "Topaz Labs",
        summary: "AI video enhancement: upscale, denoise, deblur, " +
            "deinterlace, colorize, HDR, and frame interpolation.",
        description: "Topaz Labs' Video API — the models behind Topaz Video " +
            "AI as async jobs: precision and generative upscaling to 4K, " +
            "denoising, motion deblur, deinterlacing, face recovery, " +
            "colorization, SDR-to-HDR conversion, and frame interpolation " +
            "for slow motion and frame-rate changes. Topaz downloads the " +
            "source from a public URL and returns a 7-day download link.",
        homepageUrl: "https://www.topazlabs.com",
        docsUrl: "https://developer.topazlabs.com",
        categories: ["video-enhancement"],
    },
    auth: { inject: presets.auth.header("X-API-Key") },
    request: { baseUrl: "https://api.topazlabs.com" },
    // 30 min per run (monid-services parity). Diffusion jobs can queue
    // upstream for most of it.
    timeouts: { requestMs: 30_000, pollMs: 30_000, runMs: 1_800_000 },
    usage: {
        credits: { default: { label: "Topaz credits" } },
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            label: "Topaz credits",
            consumes: { credit: "default", amount: 1 },
        },
        /** The credits Topaz committed: the sum of the record's `commit`
         *  ledger rows. An empty ledger on a delivered job falls back to
         *  Topaz's own low estimate (`estimates.cost[0]`), which matched the
         *  ledger on every monid-services drill. */
        evidence: ({ data }) => {
            const record = data.output as Record<string, Json>;
            let committed = 0;
            const rows = Array.isArray(record?.transactions)
                ? record.transactions
                : [];
            for (const row of rows) {
                const entry = row as Record<string, Json>;
                const amount = Number(entry?.amount);
                if (entry?.operation === "commit" && amount > 0) {
                    committed += amount;
                }
            }
            if (committed > 0) return { counts: { "CREDIT": committed } };
            const estimates = record?.estimates as Record<string, Json>;
            const cost = Array.isArray(estimates?.cost) ? estimates.cost : [];
            const low = Number(cost[0]);
            return { counts: { "CREDIT": low > 0 ? low : 0 } };
        },
        /** The vendor's claim is the committed ledger; the output drops the
         *  ledger and the account fields (monid-services
         *  `VIDEO_INTERNAL_FIELDS`). */
        consolidate: ({ data, utils }) => {
            const record = data.output as Record<string, Json>;
            let committed = 0;
            const rows = Array.isArray(record?.transactions)
                ? record.transactions
                : [];
            for (const row of rows) {
                const entry = row as Record<string, Json>;
                const amount = Number(entry?.amount);
                if (entry?.operation === "commit" && amount > 0) {
                    committed += amount;
                }
            }
            let output = data.output;
            for (
                const field of [
                    "userId",
                    "adminId",
                    "transactions",
                    "processing",
                    "overrides",
                    "version",
                    "lastEventTs",
                ]
            ) {
                output = utils.json.pluck(output, "$." + field).rest;
            }
            return {
                credits:
                    (committed > 0 ? { default: committed } : {}) as Record<
                        string,
                        number
                    >,
                output,
            };
        },
    },
    lifecycle: {
        /** Non-2xx (Topaz could not fetch the URL, rejected the metadata,
         *  or had no capacity) is data, zero-billed; a 2xx without a
         *  `requestId` THROWS. */
        start: async ({ utils }) => {
            const $ = utils.json;
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const requestId = $.optionalStr(res.body, "$.requestId");
            if (requestId === undefined) {
                // nothing to poll: an infrastructure failure, not data
                // (monid-services parity)
                throw Object.assign(
                    new Error("Topaz video request returned no requestId"),
                    { retriable: false },
                );
            }
            return { kind: "RUNNING", state: { externalRunId: requestId } };
        },
        /** failed/canceled/canceling end as OUR 500 with the status body
         *  (zero-billed); `complete` reads the record; a delivered record
         *  without a download link is OUR 502. A failed read THROWS. */
        poll: async ({ data, utils }) => {
            const $ = utils.json;
            const id = data.lifecycle.state.externalRunId;
            if (id === undefined) {
                throw Object.assign(
                    new Error("topaz poll without externalRunId"),
                    { retriable: false },
                );
            }
            const status = await utils.http({
                method: "GET",
                path: "/video/" + encodeURIComponent(id) + "/status",
            });
            if (status.status < 200 || status.status >= 300) {
                throw new Error(
                    "topaz status read failed with HTTP " + status.status,
                );
            }
            const state = $.optionalStr(status.body, "$.status") ?? "";
            if (
                state === "failed" || state === "canceled" ||
                state === "canceling"
            ) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 500,
                    providerHttpStatus: status.status,
                    output: status.body,
                };
            }
            if (state !== "complete") {
                return { kind: "RUNNING", state: { externalRunId: id } };
            }
            const record = await utils.http({
                method: "GET",
                path: "/video/" + encodeURIComponent(id),
            });
            if (record.status < 200 || record.status >= 300) {
                throw new Error(
                    "topaz record read failed with HTTP " + record.status,
                );
            }
            const link = $.optionalStr(
                record.body,
                "$.destination.download.url",
            );
            return {
                kind: "COMPLETED",
                httpStatus: link === undefined ? 502 : 200,
                providerHttpStatus: record.status,
                output: record.body,
                state: { externalRunId: id },
            };
        },
        /** Cancel upstream. A confirmed cancel settles nothing (the job
         *  delivers no output); an unconfirmed one is UNRESOLVED. */
        stop: async ({ data, utils }) => {
            const id = data.lifecycle.state.externalRunId;
            if (id === undefined) {
                return { kind: "UNRESOLVED", reason: "no job id in state" };
            }
            const res = await utils.http({
                method: "DELETE",
                path: "/video/" + encodeURIComponent(id),
            });
            if (res.status >= 200 && res.status < 300) return;
            return {
                kind: "UNRESOLVED",
                reason: "cancel answered HTTP " + res.status,
                state: { externalRunId: id },
            };
        },
    },
});
