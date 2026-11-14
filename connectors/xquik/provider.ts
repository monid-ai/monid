import { defineProvider, presets } from "@shared/core";

/**
 * Xquik (xquik.com), an X (Twitter) data API. Seven synchronous reads
 * against `https://xquik.com/api/v1`, auth `x-api-key`.
 *
 * Xquik publishes one price for these reads, $0.00015 per returned tweet,
 * profile or follower (https://xquik.com, 2026-11-14), so the
 * pool is US dollars. Xquik bills only the rows a response returns, and an
 * error bills nothing. Its own meter is the `X-Xquik-Credits-Charged`
 * response header, which no pure hook can read, so the provider declares
 * no consolidate and each list read counts its returned rows.
 */
export default defineProvider({
    name: "xquik",
    meta: {
        displayName: "Xquik",
        summary: "X (Twitter) data API for tweets, profiles & followers.",
        description: "Xquik is the world's fastest & cheapest X (Twitter) " +
            "data API. It has the most complete X data. Search tweets with " +
            "X search operators & filters. Read a tweet, a profile, a " +
            "timeline or a follower list. Xquik bills only delivered, unique rows that " +
            "match your filters, & it never pads rows. Every returned " +
            "tweet, profile or follower costs $0.00015.",
        homepageUrl: "https://xquik.com",
        docsUrl: "https://docs.xquik.com",
        categories: ["twitter"],
        notes: [
            "Each returned tweet, profile or follower costs $0.00015. A " +
            "page a filter empties costs nothing.",
            "An error answers {error, message} & costs nothing. A missing " +
            "or suspended account answers 404 user_not_found.",
            "Lists page with next_cursor. Send it as cursor with the same " +
            "filters for the next page.",
            "A query parameter outside an endpoint's schema fails " +
            "INVALID_INPUT, since Xquik prices some filters above the " +
            "read price.",
            "A page sent again with the same cursor costs nothing at " +
            "Xquik but settles its rows here. Xquik states that charge " +
            "only in the X-Xquik-Credits-Charged response header.",
            "Reads run on Xquik's infrastructure & return public X data. " +
            "Xquik is an independent service, not affiliated with X Corp.",
        ],
    },
    auth: { inject: presets.auth.header("x-api-key") },
    request: { baseUrl: "https://xquik.com/api/v1" },
    timeouts: { requestMs: 120_000, runMs: 120_000 },
    usage: {
        credits: { default: { label: "US dollars" } },
    },
});
