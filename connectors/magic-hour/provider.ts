import { defineProvider, presets } from "@shared/core";

/**
 * Magic Hour: asynchronous AI image, video and audio tools.
 * Public schemas and starting prices, verified 2026-10-27:
 * https://docs.magichour.ai/api-reference/openapi.json
 * https://docs.magichour.ai/api-reference/models#image-models
 * The public model page does not publish every resolution/batch rate. Full
 * estimates also follow the first-party API charging source at web-app commit
 * 595e4b97aa511290d9d52d86ad7ce31f57d4d9ad (image provider configs and self-hosted.ts).
 * The final reported credits_charged remains the vendor settlement meter.
 */
export default defineProvider({
    name: "magic-hour",
    meta: {
        displayName: "Magic Hour",
        summary:
            "Kling, Seedance, Veo and other AI image, video and audio tools through one API.",
        description: "Magic Hour provides APIs for generating and editing " +
            "images, videos, and audio, including Kling 2.6 and Kling 3.0 text-to-video, image-to-video, " +
            "Kling 3.0 character motion transfer and talking ads. Submit a generation, poll its project, and receive " +
            "temporary download URLs for the generated media.",
        homepageUrl: "https://magichour.ai",
        docsUrl: "https://docs.magichour.ai",
        categories: [
            "image-generation",
            "video-generation",
            "music-generation",
            "speech",
        ],
        notes: [
            "Generation is asynchronous; Monid polls the corresponding project until it completes.",
            "Credit estimates count Magic Hour credits, not US dollars. Monid sets the hosted USD rate card; inspect the selected endpoint and price the exact model, resolution, duration, audio and reference inputs before running. Direct-account payment options: https://docs.magichour.ai/billing/subscription-pricing and https://docs.magichour.ai/billing/usage-based-pricing.",
            "Download URLs expire. Save completed output promptly.",
            "A submission with unknown acceptance must be reconciled with Magic Hour before another paid create. Recover a received project ID instead of creating again.",
            "Account, saved-item and project operations act on the account owning the provider key. The host must enforce caller authorization, project ownership and confirmation of destructive deletes.",
            "The original GIF no-download error contract is preserved; Monid must reconcile any provider charge on that legacy error. Expanded generations retain their accepted ID while awaiting downloads; timeout settlement remains host-owned.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.magichour.ai" },
    timeouts: { requestMs: 30_000, runMs: 600_000, pollMs: 5_000 },
    lifecycle: {
        start: async ({ data, utils }) => {
            if (
                data.request.method !== "POST" ||
                data.request.url.endsWith("/v1/files/upload-urls")
            ) {
                const res = await utils.request();
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }

            // Classify every supported create before sending it. An unknown POST
            // must never silently become an image-project poll.
            const imageRoutes = [
                "ai-clothes-changer",
                "ai-face-editor",
                "ai-gif-generator",
                "ai-image-editor",
                "ai-headshot-generator",
                "ai-image-generator",
                "ai-image-upscaler",
                "ai-meme-generator",
                "ai-qr-code-generator",
                "body-swap",
                "face-swap-photo",
                "head-swap",
                "image-background-remover",
                "photo-colorizer",
            ];
            const videoRoutes = [
                "ai-talking-photo",
                "ai-ugc-ad",
                "ai-video-editor",
                "ai-video-translator",
                "ai-video-upscaler",
                "animation",
                "audio-to-video",
                "auto-subtitle-generator",
                "character-replace",
                "face-swap",
                "image-to-video",
                "lip-sync",
                "text-to-video",
                "video-to-video",
            ];
            const audioRoutes = [
                "ai-music-generator",
                "ai-voice-cloner",
                "ai-voice-generator",
            ];
            const collection = data.request.url.endsWith("/v1/face-detection")
                ? "face-detection"
                : imageRoutes.some((path) =>
                        data.request.url.endsWith("/v1/" + path)
                    )
                ? "image-projects"
                : videoRoutes.some((path) =>
                        data.request.url.endsWith("/v1/" + path)
                    )
                ? "video-projects"
                : audioRoutes.some((path) =>
                        data.request.url.endsWith("/v1/" + path)
                    )
                ? "audio-projects"
                : undefined;
            if (collection === undefined) {
                throw Object.assign(
                    new Error("Unknown Magic Hour create route"),
                    {
                        retriable: false,
                    },
                );
            }

            // A transport failure may occur after acceptance. Do not encourage
            // a second paid create when no project ID was received.
            let res;
            try {
                res = await utils.request();
            } catch (error) {
                if (
                    error !== null && typeof error === "object" &&
                    "code" in error && error.code === "MISSING_CREDENTIAL"
                ) {
                    // Authentication failed before dispatch; preserve the setup error.
                    throw error;
                }
                throw Object.assign(
                    new Error(
                        "Magic Hour submission outcome unknown; do not resubmit; reconcile with the provider",
                    ),
                    { retriable: false },
                );
            }
            if (res.status < 200 || res.status >= 300) {
                if ([400, 401, 402, 404, 422].includes(res.status)) {
                    return {
                        kind: "COMPLETED",
                        httpStatus: res.status,
                        output: res.body,
                    };
                }
                throw Object.assign(
                    new Error(
                        "Magic Hour submission outcome unknown; do not resubmit; reconcile with the provider",
                    ),
                    { retriable: false },
                );
            }
            const projectId = utils.json.optionalGet(res.body, "$.id");
            if (typeof projectId !== "string" || projectId === "") {
                throw Object.assign(
                    new Error(
                        "Magic Hour submission returned no project ID; do not resubmit; reconcile with the provider",
                    ),
                    { retriable: false },
                );
            }
            const submittedCredits = utils.json.optionalNum(
                res.body,
                "$.credits_charged",
            );
            return {
                kind: "RUNNING",
                state: {
                    externalRunId: projectId,
                    data: {
                        collection,
                        ...(submittedCredits === undefined
                            ? {}
                            : { submittedCredits }),
                    },
                },
            };
        },
        poll: async ({ data, utils, logger }) => {
            const projectId = data.lifecycle.state.externalRunId;
            if (projectId === undefined) {
                throw Object.assign(
                    new Error("Magic Hour poll without externalRunId in state"),
                    { retriable: false },
                );
            }
            const storedCollection = utils.json.optionalGet(
                data.lifecycle.state.data ?? {},
                "$.collection",
            );
            // Existing hosted GIF runs can predate collection-bearing state.
            const collection = storedCollection === undefined &&
                    data.request.url.endsWith("/v1/ai-gif-generator")
                ? "image-projects"
                : storedCollection;
            if (
                collection !== "face-detection" &&
                collection !== "image-projects" &&
                collection !== "video-projects" &&
                collection !== "audio-projects"
            ) {
                throw Object.assign(
                    new Error(
                        "Magic Hour poll has no valid project collection; reconcile the existing project ID",
                    ),
                    { retriable: false },
                );
            }
            const res = await utils.http({
                method: "GET",
                path: `/v1/${collection}/${encodeURIComponent(projectId)}`,
            });
            if (res.status < 200 || res.status >= 300) {
                throw new Error(
                    "Magic Hour project query returned " + String(res.status),
                );
            }
            const status = utils.json.optionalGet(res.body, "$.status");
            if (
                status === "queued" ||
                status === "rendering" ||
                status === "draft"
            ) {
                return {
                    kind: "RUNNING",
                    state: {
                        externalRunId: projectId,
                        data: data.lifecycle.state.data,
                        ...(typeof status === "string"
                            ? { stage: status }
                            : {}),
                    },
                };
            }
            if (status === "error" || status === "canceled") {
                logger.warn("Magic Hour project did not complete", {
                    projectId,
                    status,
                });
                return {
                    kind: "COMPLETED",
                    httpStatus: status === "canceled" ? 409 : 500,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            if (status !== "complete") {
                logger.warn(
                    "Magic Hour project status unrecognized — treating as in flight",
                    { projectId, status: String(status) },
                );
                return { kind: "RUNNING" };
            }
            const downloads = utils.json.optionalGet(res.body, "$.downloads");
            const hasDownload = Array.isArray(downloads) &&
                downloads.some(
                    (item) =>
                        item !== null &&
                        typeof item === "object" &&
                        !Array.isArray(item) &&
                        typeof item.url === "string" &&
                        item.url !== "",
                );
            if (
                !hasDownload &&
                collection !== "face-detection"
            ) {
                if (data.request.url.endsWith("/v1/ai-gif-generator")) {
                    // Preserve the existing GIF result contract. Monid must
                    // reconcile any provider charge for this error outcome.
                    return {
                        kind: "COMPLETED",
                        httpStatus: 502,
                        providerHttpStatus: res.status,
                        output: res.body,
                    };
                }
                // A completed project can already be charged. Keep its ID and
                // final reported credits available while waiting for output.
                const submittedCredits = utils.json.optionalNum(
                    data.lifecycle.state.data ?? {},
                    "$.submittedCredits",
                );
                const finalCredits = utils.json.optionalNum(
                    res.body,
                    "$.credits_charged",
                );
                logger.warn(
                    "Magic Hour project is complete without a download; reconcile the existing project ID if polling stops",
                    { projectId },
                );
                return {
                    kind: "RUNNING",
                    state: {
                        externalRunId: projectId,
                        stage: "complete_awaiting_download",
                        data: {
                            collection,
                            ...(submittedCredits === undefined
                                ? {}
                                : { submittedCredits }),
                            ...(finalCredits === undefined
                                ? {}
                                : { finalCredits }),
                        },
                    },
                };
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
                label: "Magic Hour credits",
                description: "Credits deducted from the Magic Hour account.",
            },
        },
        consolidate: ({ data, utils }) => {
            const status = utils.json.optionalGet(data.output, "$.status");
            const credits = status === "complete"
                ? utils.json.optionalNum(data.output, "$.credits_charged")
                : undefined;
            return {
                credits: {
                    ...(credits !== undefined ? { default: credits } : {}),
                },
                output: data.output,
            };
        },
    },
});
