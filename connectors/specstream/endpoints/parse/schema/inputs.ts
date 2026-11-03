import { z } from "zod";

/**
 * `POST /v1/parse` request body. `retained` and `expected_source_hash` are the
 * workspace editor's re-read hooks and are not mirrored: a new request is
 * always `q` alone.
 */
export const zParseBody = z.object({
    q: z.string().min(1).max(16000).describe(
        "The data you need, in plain words: what to find, the conditions " +
            "every row must meet, and the facts to bring back for each row.",
    ),
    kind: z.string().min(1).describe(
        "Result kind to pin, such as `organization`, `local_business`, " +
            "`grant`, `tender`, `scholarly_work`, `software_repository` or " +
            "`person`. The reading never switches away from it. Omit it and " +
            "the kind is read from the request.",
    ).optional(),
    locale: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/).describe(
        "Language and region of the request, such as `en-US` or `fr-FR`.",
    ).optional(),
});
