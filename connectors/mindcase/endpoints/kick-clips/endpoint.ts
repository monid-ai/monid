import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zKickClipsBody } from "./schema/inputs.ts";

/**
 * Mindcase `kick/clips`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Kick Clips",
        summary: "Kick clips with channel, title, clip and video URLs, views " +
            "and duration. Pass the channels to pull from.",
        description:
            "Kick clips with channel, title, clip and video URLs, views " +
            "and duration. Pass the channels to pull from. Returns one " +
            "row per clip with clipId, channel, title, clipUrl, videoUrl, " +
            "views, durationS, created, thumbnail, isMature, " +
            "livestreamId, category, creator. $0.0025 per clip; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/kick/clips",
        categories: ["video-search"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/kick/clips",
    request: { method: "POST", path: "/v1/data/kick/clips/run" },
    input: {
        schema: {
            body: zKickClipsBody.extend({
                maxResults: zKickClipsBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many clips to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0025 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
