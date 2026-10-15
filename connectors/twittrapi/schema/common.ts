import { z } from "zod";

/**
 * Shared request mirrors for TwittrAPI (https://www.twittrapi.com/openapi.json,
 * optionality only — D25). Fragments used by two or more endpoints; each
 * endpoint's `schema/inputs.ts` composes them into its own strict objects.
 *
 * `format` is deliberately absent from every mirror: the provider's
 * `input.toRequest` pins `format=simple` (see provider.ts).
 */

/** Numeric tweet id, the number at the end of a tweet URL. */
export const zTweetId = z.string().regex(/^[0-9]{1,30}$/).describe(
    "Numeric tweet ID (digits only, up to 30), the number at the end of " +
        "the tweet URL, e.g. 1849501279624241510.",
);

/** Handle as a PATH segment (2–15 characters, optional leading @). */
export const zHandle = z.string().regex(/^@?[A-Za-z0-9_]{2,15}$/).describe(
    "Handle, with or without a leading @ (2 to 15 letters, digits or " +
        "underscores), e.g. XDevelopers.",
);

/** `{tweetId}` path params. */
export const zTweetPathParams = z.object({ tweetId: zTweetId }).strict();

/** `{username}` path params. */
export const zHandlePathParams = z.object({ username: zHandle }).strict();

/** `{userId}` path params of the per-user timelines. */
export const zUserPathParams = z.object({
    userId: z.string().regex(/^(-1|[0-9]{1,30})$/).describe(
        "Numeric user ID (digits only, up to 30). To pass a handle " +
            "instead, use -1 here and set the `username` query parameter.",
    ),
}).strict();

/** `count` — the page-size HINT every paginated endpoint takes. */
export const zCount = z.number().int().describe(
    "Number of items to ask X for (vendor default 20). Sent to X as a " +
        "hint: X decides how many a page holds.",
);

/** `cursor` — the bottom cursor of the previous page. */
export const zCursor = z.string().min(1).describe(
    "`nextCursor` from the previous page. Leave it out for the first page.",
);

/** The query fields every per-user timeline shares. */
export const zUserTimelineQuery = {
    username: z.string().min(1).describe(
        "Handle, with or without @. When set it is used instead of " +
            "`userId` (pass -1 as `userId`); the API looks the ID up first. " +
            "Still one call.",
    ).optional(),
    count: zCount.optional(),
    cursor: zCursor.optional(),
};

/** `listId` — numeric list id from x.com/i/lists/<listId>. */
export const zListId = z.string().regex(/^[0-9]+$/).describe(
    "Numeric list ID, the number in the list URL (x.com/i/lists/<listId>).",
);

/** For the lookups that take no query parameters: declared EMPTY and strict
 *  so an unknown key fails INVALID_INPUT instead of riding to the wire (an
 *  undeclared queryParams schema is not validated at all). */
export const zNoQueryParams = z.object({}).strict();
