import { z } from "zod";

/** GET /api/open/v1/episodes/{seq} — the public episode sequence number. */
export const zEpisodeInfoPathParams = z.object({
    seq: z.string().regex(/^[1-9]\d*$/).describe(
        'Podwise episode sequence number as a decimal string (e.g. "9480205"), from a search result or a podwise.ai/episodes/<seq> URL.',
    ),
});
