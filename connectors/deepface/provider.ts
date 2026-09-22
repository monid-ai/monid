import { defineProvider, presets } from "@shared/core";
import { z } from "zod";

export default defineProvider({
    name: "deepface",
    meta: {
        displayName: "deepface.dev",
        summary:
            "Face embeddings, two-image verification, and vector comparison.",
        description:
            "Generate facial embeddings, compare two consented images, or compare " +
            "two existing embeddings. This connector uses the dedicated monid_v1 " +
            "contract, not the provider's ordinary prepaid pricing. It does not " +
            "search for identities or maintain a face database.",
        homepageUrl: "https://deepface.dev",
        docsUrl: "https://docs.deepface.dev",
        categories: ["embeddings", "face-verification"],
        notes: [
            "Requires a dedicated, activated monid_v1 contracted API key; ordinary prepaid or Workweek keys are not supported.",
            "The required x-deepface-billing-profile header is checked by the gateway before compute. A missing or mismatched profile is a non-billable error.",
            "Use images and embeddings only with the necessary consent and rights. Inputs and outputs can contain sensitive biometric information.",
            "Images must be base64 JPEG, PNG, or WebP data; remote URLs, file paths, batches, and asynchronous jobs are not exposed.",
            "The default credit pool is deepface.dev credits, with a proposed provider settlement value of USD 0.001 per credit. Broker setup and commercial activation are separate from this connector release.",
        ],
    },
    auth: { inject: presets.auth.header("x-api-key") },
    request: {
        baseUrl: "https://api.deepface.dev",
        headers: { "x-deepface-billing-profile": "monid_v1" },
    },
    input: {
        schema: {
            queryParams: z.object({}).strict(),
            pathParams: z.object({}).strict(),
        },
    },
    // The provider gateway permits up to 240 seconds upstream execution.
    timeouts: { requestMs: 250_000, runMs: 260_000 },
    usage: { credits: { default: { label: "deepface.dev credits" } } },
    lifecycle: {
        // One synchronous relay, not an async job. Hosted executions MUST reuse
        // this UUID across activity retries. The gateway rejects a duplicate
        // reservation with 409; it does not replay the original result.
        start: async ({ data, utils }) => {
            if (
                !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
                    .test(data.run.runId)
            ) {
                throw Object.assign(
                    new Error("deepface requires a stable UUID runId"),
                    { retriable: false },
                );
            }
            const response = await utils.request({
                headers: { "x-request-id": data.run.runId },
            });
            return {
                kind: "COMPLETED",
                httpStatus: response.status,
                output: response.body,
            };
        },
    },
});
