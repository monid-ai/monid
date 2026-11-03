import { z } from "zod";

/** `GET /v1/finds/{id}/rows` path parameters. */
export const zFindRowsPathParams = z.object({
    id: z.string().min(1).describe(
        "The find id, returned as `find_id` by specstream#v1/capacity/executions.",
    ),
});

/** `GET /v1/finds/{id}/rows` query parameters. */
export const zFindRowsQueryParams = z.object({
    cursor: z.string().max(2048).describe(
        "The `next_cursor` of the previous page. Omit it for the first page.",
    ).optional(),
    limit: z.number().int().min(1).max(100).describe(
        "Rows per page (1 to 100).",
    ).optional(),
});
