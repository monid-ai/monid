import { z } from "zod";

/** `GET /jobs/{id}` path parameters. */
export const zJobPathParams = z.object({
    id: z.string().uuid().describe(
        "A HireHouse job ID (UUID) from hirehouse#jobs/search.",
    ),
}).strict();
