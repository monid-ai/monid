import { z } from "zod";
import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";

const zRequestBody = z.strictObject({
    objective: z.string().min(10).max(1000).describe(
        "What insurance help the consumer is seeking.",
    ),
    product: z.enum([
        "auto",
        "home",
        "renters",
        "life",
        "health",
        "commercial",
    ]),
    state: z.string().regex(/^[A-Z]{2}$/).describe(
        "Two-letter US state code.",
    ),
    buyerType: z.enum(["consumer", "business"]).optional(),
    consent: z.literal(true).describe(
        "Caller attests that the consumer agreed to share this request; Insuron does not independently verify the attestation.",
    ),
    consentReference: z.string().trim().min(1).max(200).describe(
        "Caller-provided reference to separately recorded permission to share; not independently verified.",
    ),
});

export default defineEndpoint({
    meta: {
        displayName: "Submit Insurance Request",
        summary: "Submit a caller-attested insurance objective for matching.",
        description:
            "Send the consumer's objective, insurance product, two-letter " +
            "state, and caller-provided permission reference. The required " +
            "consent flag is a caller attestation, not independently verified " +
            "by Insuron or this connector. Consent to share the request does " +
            "not authorize a phone call or SMS. Name, phone, and email fields " +
            "are not accepted. Free-text objective and consentReference may " +
            "still contain sensitive content. The API's 200 needs_information " +
            "and 201 accepted responses are returned with their original " +
            "status. This endpoint does not make calls, create quotes, or issue policies.",
        docsUrl: "https://insuron.io",
        categories: ["insurance-matching"],
        notes: [
            "The 200 needs_information response means no request was created; " +
            "201 means the request was accepted for in-app review/routing.",
        ],
    },
    request: { method: "POST", path: "/requests" },
    input: { schema: { body: zRequestBody } },
    lifecycle: {
        start: async ({ data, utils }) => {
            // Reuse Monid's stable run identity when the engine retries this
            // submission, allowing Insuron's application-scoped API to dedupe.
            const response = await utils.request({
                headers: {
                    ...data.request.headers,
                    "Idempotency-Key": data.run.runId,
                },
            });
            return {
                kind: "COMPLETED",
                httpStatus: response.status,
                output: response.body,
            };
        },
    },
    output: {
        fromResponse: ({ data, utils }) => {
            const status = utils.json.get(data.output, "$.status");
            if (status === "needs_information") {
                const missingFields = utils.json.get(
                    data.output,
                    "$.missingFields",
                );
                if (
                    !Array.isArray(missingFields) ||
                    !missingFields.every((field) => typeof field === "string")
                ) {
                    throw new Error(
                        "Insuron needs_information response has invalid missingFields",
                    );
                }
                const view: Record<string, Json> = { status, missingFields };
                return view;
            }
            const id = utils.json.get(data.output, "$.id");
            const product = utils.json.get(data.output, "$.product");
            const state = utils.json.get(data.output, "$.state");
            const mode = utils.json.get(data.output, "$.mode");
            const createdAt = utils.json.get(data.output, "$.createdAt");
            if (
                typeof id !== "string" || typeof status !== "string" ||
                typeof product !== "string" || typeof state !== "string" ||
                typeof mode !== "string" || typeof createdAt !== "string"
            ) {
                throw new Error("Insuron accepted response has invalid fields");
            }
            const view: Record<string, Json> = {
                id,
                status,
                product,
                state,
                mode,
                createdAt,
            };
            return view;
        },
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
