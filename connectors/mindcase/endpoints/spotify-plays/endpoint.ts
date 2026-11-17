import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSpotifyPlaysBody } from "./schema/inputs.ts";

/**
 * Mindcase `spotify/plays`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Spotify Plays",
        summary: "Spotify track play counts with title, artists, album and " +
            "IDs. Pass track or album URLs.",
        description:
            "Spotify track play counts with title, artists, album and " +
            "IDs. Pass track or album URLs. Returns one row per play with " +
            "trackUrl, trackId, title, artists, artistIds, albumName, " +
            "albumId, plays, durationS, releaseDate, trackNumber, " +
            "discNumber, explicit, label, topTrackRank, thumbnail, " +
            "sourceQuery. $0.0015 per play; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/spotify/plays",
        categories: ["social-media"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/spotify/plays",
    request: { method: "POST", path: "/v1/data/spotify/plays/run" },
    input: {
        schema: {
            body: zSpotifyPlaysBody.extend({
                maxResults: zSpotifyPlaysBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many plays to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0015 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
