import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSoundcloudTracksBody } from "./schema/inputs.ts";

/**
 * Mindcase `soundcloud/tracks`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "SoundCloud Tracks",
        summary: "SoundCloud tracks with track URL, artist details and play " +
            "count. Search by keyword or pass URLs.",
        description:
            "SoundCloud tracks with track URL, artist details and play " +
            "count. Search by keyword or pass URLs. Returns one row per " +
            "track with title, trackUrl, trackId, artist, artistUrl, " +
            "artistId, plays, likes, reposts, comments, durationS, genre, " +
            "tags, postedDate, displayDate, description, artwork, label, " +
            "isrc, license, artistFollowers, artistVerified, sourceQuery, " +
            "rank. Call it by search keywords (queries) or urls (urls). " +
            "$0.001 per track; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/soundcloud/tracks",
        categories: ["social-media"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/soundcloud/tracks",
    request: { method: "POST", path: "/v1/data/soundcloud/tracks/run" },
    input: {
        schema: {
            body: zSoundcloudTracksBody.extend({
                maxResults: zSoundcloudTracksBody.shape.maxResults.unwrap().min(
                    1,
                ).default(100).describe("How many tracks to return in total."),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.001 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
