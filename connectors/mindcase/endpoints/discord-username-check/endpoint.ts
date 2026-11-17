import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zDiscordUsernameCheckBody } from "./schema/inputs.ts";

/**
 * Mindcase `discord/username-check`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Discord Username Check",
        summary:
            "Get Discord username with status, available, invalid reason, " +
            "invalid code, by usernames.",
        description:
            "Get Discord username with status, available, invalid reason, " +
            "invalid code, by usernames. Returns one row per username " +
            "with username, status, available, invalidReason, " +
            "invalidCode. $0.0075 per username; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/discord/username-check",
        categories: ["social-media"],
    },
    endpoint: "/discord/username-check",
    request: { method: "POST", path: "/v1/data/discord/username-check/run" },
    input: {
        schema: {
            body: zDiscordUsernameCheckBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0075 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.usernames.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
