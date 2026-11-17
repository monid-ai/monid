import { z } from "zod";

/** GET /api/open/v1/episodes/{seq}/summary */
export const zEpisodeSummaryPathParams = z.object({
    seq: z.string().regex(/^[1-9]\d*$/).describe(
        'Podwise episode sequence number, as a decimal string (e.g. "9480205"), from a search result or the number in a podwise.ai/episodes/<seq> URL.',
    ),
});

/**
 * No query params. The Podwise API accepts `translation`, but translating on
 * demand is untested (it may call an LLM at our cost and exceed the run
 * budget), so it is not offered. Strict, so a caller who sends it gets
 * INVALID_INPUT instead of having it forwarded: with no schema at all the
 * engine would pass unknown query params through to Podwise.
 */
export const zEpisodeSummaryQueryParams = z.object({}).strict();
