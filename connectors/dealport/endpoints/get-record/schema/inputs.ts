import { z } from "zod";

/**
 * `GET /api/v1/records/{id}` path parameters mirror
 * (https://app.dealport.com/openapi/v1.json). Accepts either a 36-char
 * Dealport company UUID or a 10-digit NYC BBL.
 */
export const zGetRecordPathParams = z.object({
    id: z.string().regex(
        /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}|[1-5][0-9]{9})$/,
    ).describe(
        "Dealport company UUID (36-character UUID) or 10-digit NYC BBL (e.g. '1008350041').",
    ),
}).strict();
