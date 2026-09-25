import { z } from "zod";
import { zDistanceMetric, zImageData } from "../../../schema/common.ts";

const zVector = z.array(z.number());
const zVectorList = z.array(z.union([
    zVector,
    z.object({
        id: z.union([z.string(), z.number().int()]).optional(),
        vector: zVector,
    }),
]));

export const zCompareBody = z.object({
    model_name: z.string().max(200),
    img: zImageData.optional(),
    source_vector: zVector.optional(),
    vector: z.union([zVector, zVectorList]).optional(),
    target_vector: zVector.optional(),
    target_vectors: zVectorList.optional(),
    vectors: zVectorList.optional(),
    vector_b: zVector.optional(),
    distance_metric: zDistanceMetric.optional(),
    metric: zDistanceMetric.optional(),
    threshold: z.number().optional(),
    detector_backend: z.string().optional(),
    enforce_detection: z.boolean().optional(),
    align: z.boolean().optional(),
    normalization: z.string().optional(),
    face_index: z.number().int().optional(),
});
