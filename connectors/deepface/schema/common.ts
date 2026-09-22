import { z } from "zod";

// Native wire fields from deepface.dev's canonical OpenAPI. Contract-specific
// tightening and defaults belong in endpoint.ts, not this vendor mirror.
export const zImageData = z.string().describe(
    "Base64 image data or a data URL.",
);
export const zImageOptions = z.object({
    model_name: z.string().max(200).optional(),
    detector_backend: z.string().optional(),
    enforce_detection: z.boolean().optional(),
    align: z.boolean().optional(),
    normalization: z.string().optional(),
});
export const zDistanceMetric = z.enum(["cosine", "euclidean", "euclidean_l2"]);

// Shared binding constraints: five approved models only. Raw base64 and the
// three accepted image media types are expressible in compiled JSON Schema;
// unlike a Zod refinement, the URL/path rejection survives compilation.
export const zContractModel = z.enum([
    "Facenet",
    "Facenet512",
    "OpenFace",
    "Dlib",
    "SFace",
]);
export const zContractImage = zImageData.min(4).max(13_981_050).regex(
    /^(?:data:image\/(?:jpeg|png|webp);base64,)?[A-Za-z0-9+/]+={0,2}$/,
).describe(
    "Base64 JPEG, PNG, or WebP, optionally prefixed by its data URL header; " +
        "at most 10 MiB decoded. Remote URLs and file paths are unsupported. " +
        "The gateway also validates decoded bytes and pixel limits.",
);
