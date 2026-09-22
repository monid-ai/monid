import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zContractImage, zContractModel } from "../../schema/common.ts";
import { zVerifyBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "deepface.dev Face Verification",
        summary: "Compare faces in two consented images.",
        description:
            "Submit two base64 images and an explicit model. Returns a match " +
            "decision, distance, threshold, and face regions. A non-match is a " +
            "successful, billable verification. This does not establish a " +
            "person's identity or perform liveness detection.",
        categories: ["face-verification"],
        notes: [
            "monid_v1: 1.8 credits per successful call, including verified:false; non-2xx responses cost zero.",
        ],
    },
    request: { method: "POST", path: "/verify" },
    input: {
        schema: {
            body: zVerifyBody.extend({
                img1: zContractImage,
                img2: zContractImage,
                model_name: zContractModel,
                detector_backend: z.literal("opencv").default("opencv"),
                enforce_detection: z.literal(true).default(true),
                align: z.literal(true).default(true),
                normalization: z.literal("base").default("base"),
                distance_metric: zVerifyBody.shape.distance_metric.unwrap()
                    .default("cosine"),
            }).strict(),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 1.8 },
        },
    },
});
