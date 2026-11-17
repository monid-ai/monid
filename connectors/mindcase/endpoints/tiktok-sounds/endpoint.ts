import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTiktokSoundsBody } from "./schema/inputs.ts";

/**
 * Mindcase `tiktok/sounds`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "TikTok Sounds",
        summary: "Finds TikTok sounds by keyword or looks up a specific " +
            "sound's title, artist and usage stats by URL or ID.",
        description: "Finds TikTok sounds by keyword or looks up a specific " +
            "sound's title, artist and usage stats by URL or ID. Returns " +
            "one row per sound with soundId, soundUrl, title, artist, " +
            "album, durationS, videosUsing, isOriginalSound, " +
            "commercialUseOk, ownerHandle, sourceQuery. Call it by search " +
            "by keyword (keywords) or look up by sound url or id " +
            "(soundUrls). For videos using a sound use " +
            "mindcase#tiktok/posts. $0.001 per sound; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/tiktok/sounds",
        categories: ["tiktok"],
        notes: [
            "`maxResults` does not apply to `soundUrls`: those return one " +
            "row per entry.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/tiktok/sounds",
    request: { method: "POST", path: "/v1/data/tiktok/sounds/run" },
    input: {
        schema: {
            body: zTiktokSoundsBody.extend({
                maxResults: zTiktokSoundsBody.shape.maxResults.unwrap().min(1)
                    .default(50).describe(
                        "How many sounds to return in total. Applies to Keyword search.",
                    ),
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
            const capped = body.keywords?.length ?? 0;
            const uncapped = body.soundUrls?.length ?? 0;
            const rows = uncapped +
                (capped > 0 || uncapped === 0 ? body.maxResults : 0);
            return { counts: { RESULT: rows } };
        },
    },
});
