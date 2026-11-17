import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTwitchClipsBody } from "./schema/inputs.ts";

/**
 * Mindcase `twitch/clips`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Twitch Clips",
        summary: "Twitch clips with title, URL, channel, views, duration and " +
            "game. Pass the channels.",
        description:
            "Twitch clips with title, URL, channel, views, duration and " +
            "game. Pass the channels. Returns one row per clip with " +
            "clipId, title, clipUrl, channel, views, durationS, game, " +
            "createdDate, language, isFeatured, thumbnail, sourceVideo. " +
            "For channel profiles use mindcase#twitch/profiles. $0.0025 " +
            "per clip; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/twitch/clips",
        categories: ["video-search"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/twitch/clips",
    request: { method: "POST", path: "/v1/data/twitch/clips/run" },
    input: {
        schema: {
            body: zTwitchClipsBody.extend({
                maxResults: zTwitchClipsBody.shape.maxResults.unwrap().min(1)
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
