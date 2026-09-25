import { z } from "zod";

/** GET /sports query params — the faithful vendor mirror
 *  (lumify.ai/docs). Optionality only; no defaults. */
export const zSportsQueryParams = z.object({
    active_only: z.boolean().optional().describe(
        "When true (the default), return only sports with upcoming or live coverage.",
    ),
}).strict();
