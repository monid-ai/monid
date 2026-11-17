import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTelegramChannelsBody } from "./schema/inputs.ts";

/**
 * Mindcase `telegram/channels`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Telegram Channel Info",
        summary: "Look up a Telegram channel's public profile, including " +
            "title, description, verification status and subscriber and " +
            "media counts.",
        description: "Look up a Telegram channel's public profile, including " +
            "title, description, verification status and subscriber and " +
            "media counts. Returns one row per channel with channelUrl, " +
            "username, title, description, verified, subscribers, photos, " +
            "videos, links, files. For a channel's posts use " +
            "mindcase#telegram/posts; to search posts by keyword use " +
            "mindcase#telegram/search. $0.002 per channel; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/telegram/channels",
        categories: ["social-media"],
    },
    endpoint: "/telegram/channels",
    request: { method: "POST", path: "/v1/data/telegram/channels/run" },
    input: {
        schema: {
            body: zTelegramChannelsBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.002 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.channels.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
