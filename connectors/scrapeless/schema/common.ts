import { z } from "zod";

export const zHttpUrl = z.url({ protocol: /^https?$/ });
export const zTaskId = z.string().min(1).max(512).regex(/^[A-Za-z0-9_-]+$/)
    .describe(
        "Supplier task identifier from the original create response; never submit another task to retrieve results.",
    );
export const zTaskPath = z.strictObject({ id: zTaskId });
export const zTaskIdPath = z.strictObject({ taskId: zTaskId });
export const zNativeOutput = z.object({
    provider_response: z.json().describe(
        "Full native Scrapeless response, including result fields, references, pagination and any usage evidence. No receipt fields are removed.",
    ),
    provider_http_status: z.number().int(),
    task_id: z.string().optional(),
}).passthrough();
