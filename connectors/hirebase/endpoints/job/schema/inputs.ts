import { z } from "zod";

export const zJobPathParams = z.strictObject({
    job_id: z.string().regex(/^[0-9a-fA-F]{24}$/).describe(
        "The job's _id, as returned by the search endpoints (24 hex " +
            "characters).",
    ),
});
