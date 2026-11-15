import { z } from "zod";

/**
 * Query and path fragments shared by the Xquik reads. Mirrors of
 * https://xquik.com/openapi.yaml (2026-11-15): optionality only, no
 * defaults. Bindings in each endpoint.ts apply the page-size defaults.
 */

/** `{id}` of every `/x/users/{id}` read (`UserPathId`). */
export const zUserId = z.string().min(1).max(2048).describe(
    "User ID, username with or without @, or profile URL such as " +
        "x.com/nasa. A number reads as a user ID.",
);

/** `cursor` (`AutomaticCoverageCursor`). */
export const zCursor = z.string().max(4096).describe(
    "next_cursor from the previous page. Send it with the same filters " +
        "to read the next page.",
);

/** `fields` (`Fields`). */
export const zFields = z.string().max(13085).describe(
    "Fields to keep in each row, comma-separated, such as " +
        "id,text,author.username. Dots reach nested fields. The price " +
        "stays the same.",
);

/** `omit` (`Omit`). */
export const zOmit = z.string().max(13087).describe(
    "Fields to drop from each row, comma-separated, such as " +
        "entities,media. Takes the same names as fields.",
);

/** A whole number from 0 (`WholeNumber`). */
export const zWholeNumber = z.number().int().min(0);

/** `include` / `exclude` / `only` modes for reposts and quotes. */
const zTweetMode = z.enum(["include", "exclude", "only"]);

/**
 * Tweet filters shared by tweet search and user tweets. Each filter holds
 * on every returned row, so a filtered page costs only the rows it keeps.
 */
export const zTweetFilters = z.object({
    cursor: zCursor.optional(),
    sinceDate: z.string().max(128).describe(
        "Start date as a UTC day, written YYYY-MM-DD.",
    ).optional(),
    untilDate: z.string().max(128).describe(
        "End date as a UTC day, written YYYY-MM-DD. The day itself counts.",
    ).optional(),
    sinceTime: z.string().max(128).describe(
        "Inclusive start time, as ISO 8601 such as 2026-09-25T19:20:41Z " +
            "or Unix seconds.",
    ).optional(),
    untilTime: z.string().max(128).describe(
        "Exclusive end time, as ISO 8601 or Unix seconds.",
    ).optional(),
    sinceId: z.string().max(19).describe(
        "Keep tweets whose IDs exceed this tweet ID. Send the newest ID " +
            "you hold to read only newer tweets.",
    ).optional(),
    maxId: z.string().max(19).describe(
        "Keep tweets whose IDs are at or below this tweet ID.",
    ).optional(),
    keywords: z.string().max(4096).describe(
        "Words the tweets must match, in X search syntax.",
    ).optional(),
    language: z.string().max(35).describe(
        "Language code X tags, such as en or ja.",
    ).optional(),
    mediaType: z.enum(["images", "videos", "gifs", "media", "links", "none"])
        .describe("Keep only tweets with this media, or none.").optional(),
    minLikes: zWholeNumber.describe("Minimum likes.").optional(),
    minRetweets: zWholeNumber.describe("Minimum retweets.").optional(),
    minReplies: zWholeNumber.describe("Minimum replies.").optional(),
    minViews: zWholeNumber.describe("Minimum views.").optional(),
    verifiedOnly: z.boolean().describe(
        "Keep only tweets from verified authors.",
    ).optional(),
    retweets: zTweetMode.describe(
        "Reposts to include, exclude or return alone.",
    ).optional(),
    quotes: zTweetMode.describe(
        "Quote tweets to include, exclude or return alone.",
    ).optional(),
    exactPhrase: z.string().max(4096).describe(
        "Match this exact phrase, word for word.",
    ).optional(),
    anyWords: z.string().max(4096).describe(
        "Words or quoted phrases where any one can match, separated by " +
            "spaces or commas.",
    ).optional(),
    excludeWords: z.string().max(4096).describe(
        "Words or quoted phrases to leave out, separated by spaces or " +
            "commas.",
    ).optional(),
    hashtags: z.string().max(4096).describe(
        "Hashtags separated by spaces or commas.",
    ).optional(),
    fields: zFields.optional(),
    omit: zOmit.optional(),
});

/**
 * Profile filters shared by the user list reads (followers, following and
 * user search). A profile a filter drops costs nothing.
 */
export const zUserFilters = z.object({
    minFollowers: zWholeNumber.describe(
        "Keep profiles with at least this many followers.",
    ).optional(),
    maxFollowers: zWholeNumber.describe(
        "Keep profiles with at most this many followers.",
    ).optional(),
    verifiedOnly: z.boolean().describe("Keep only verified profiles.")
        .optional(),
    blueVerifiedOnly: z.boolean().describe(
        "Keep only profiles X marks as blue verified.",
    ).optional(),
    bioContains: z.string().max(4096).describe(
        "Keep profiles whose bio has any of these comma-separated terms, " +
            "ignoring case.",
    ).optional(),
    locationContains: z.string().max(100).describe(
        "Keep profiles whose location has this text, ignoring case.",
    ).optional(),
    hasWebsite: z.boolean().describe("Keep only profiles with a website.")
        .optional(),
    enrichProfiles: z.boolean().describe(
        "Add each row's full profile, as xquik#x/users/{id} returns it. " +
            "Pages take a few seconds longer at the same price.",
    ).optional(),
    fields: zFields.optional(),
    omit: zOmit.optional(),
});
