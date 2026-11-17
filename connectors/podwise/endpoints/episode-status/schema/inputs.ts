import { z } from "zod";

/** GET /api/open/v1/episodes/{seq}/status */
export const zEpisodeStatusPathParams = z.object({
    seq: z.string().regex(/^[1-9]\d*$/).describe(
        'Podwise episode sequence number, as a decimal string (e.g. "9480205").',
    ),
});
