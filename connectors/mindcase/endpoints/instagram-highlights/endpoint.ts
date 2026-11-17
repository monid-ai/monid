import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zInstagramHighlightsBody } from "./schema/inputs.ts";

/**
 * Mindcase `instagram/highlights`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Instagram Highlights",
        summary: "Instagram story highlights with title, ID, URL and owner. " +
            "Pass the usernames to pull from.",
        description:
            "Instagram story highlights with title, ID, URL and owner. " +
            "Pass the usernames to pull from. Returns one row per " +
            "highlight with storyId, shortcode, username, profileUrl, " +
            "highlightId, highlightTitle, highlightUrl, mediaType, " +
            "imageUrl, videoUrl, videoDuration, hasAudio, width, height, " +
            "takenAt, musicTitle, musicArtist. For currently live stories " +
            "use mindcase#instagram/stories. $0.004 per highlight; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/instagram/highlights",
        categories: ["instagram"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/instagram/highlights",
    request: { method: "POST", path: "/v1/data/instagram/highlights/run" },
    input: {
        schema: {
            body: zInstagramHighlightsBody.extend({
                maxResults: zInstagramHighlightsBody.shape.maxResults.unwrap()
                    .min(1).default(10).describe(
                        "How many highlights to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.004 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
