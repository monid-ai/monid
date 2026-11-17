import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTiktokLiveRoomsBody } from "./schema/inputs.ts";

/**
 * Mindcase `tiktok/live-rooms`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "TikTok Live Rooms",
        summary: "Finds currently live TikTok rooms matching a keyword, or " +
            "checks whether a specific creator is live right now.",
        description:
            "Finds currently live TikTok rooms matching a keyword, or " +
            "checks whether a specific creator is live right now. Returns " +
            "one row per live room with liveUrl, roomId, title, host, " +
            "isLive, startedAt, viewersNow, totalViewers, likes, shares, " +
            "sellsProducts, searchQuery. Call it by search by keyword " +
            "(keywords) or check by handle (handles). For a creator's " +
            "profile use mindcase#tiktok/profiles. $0.001 per live room; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/tiktok/live-rooms",
        categories: ["tiktok"],
        notes: [
            "`maxResults` does not apply to `handles`: those return one " +
            "row per entry.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/tiktok/live-rooms",
    request: { method: "POST", path: "/v1/data/tiktok/live-rooms/run" },
    input: {
        schema: {
            body: zTiktokLiveRoomsBody.extend({
                maxResults: zTiktokLiveRoomsBody.shape.maxResults.unwrap().min(
                    1,
                ).default(50).describe(
                    "How many live rooms to return in total. Applies to Keyword search.",
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
            const uncapped = body.handles?.length ?? 0;
            const rows = uncapped +
                (capped > 0 || uncapped === 0 ? body.maxResults : 0);
            return { counts: { RESULT: rows } };
        },
    },
});
