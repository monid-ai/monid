import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zDiscordServersBody } from "./schema/inputs.ts";

/**
 * Mindcase `discord/servers`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Discord Servers",
        summary: "Get Discord servers with name, invite url, vanity code, " +
            "members, online, tags, by search keywords.",
        description:
            "Get Discord servers with name, invite url, vanity code, " +
            "members, online, tags, by search keywords. Returns one row " +
            "per server with serverId, name, inviteUrl, vanityCode, " +
            "members, online, tags, serverTag, serverTagBadgeUrl, " +
            "serverTagUsers, boosts, iconUrl, createdDate. To check if a " +
            "username is free use mindcase#discord/username-check. $0.01 " +
            "per server plus a flat $0.25 search fee per run, charged " +
            "even when nothing is found.",
        docsUrl: "https://docs.mindcase.co/apis/discord/servers",
        categories: ["social-media"],
        notes: [
            "Adds a flat $0.25 search fee to every run, including runs " +
            "that find nothing.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/discord/servers",
    request: { method: "POST", path: "/v1/data/discord/servers/run" },
    input: {
        schema: {
            body: zDiscordServersBody.extend({
                maxResults: zDiscordServersBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many servers to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                row: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "servers",
                    description: "servers returned",
                    consumes: { credit: "default", amount: 0.01 },
                },
                search: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "search fee",
                    description:
                        "one flat fee per run, charged even when nothing is found",
                    consumes: { credit: "default", amount: 0.25 },
                },
            },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { row: rows, search: 1 } };
        },
        evidence: ({ data, utils }) => {
            const input = (data.input.body ?? {}) as Record<string, unknown>;
            // deno-lint-ignore no-explicit-any
            const body = (input.params ?? input) as any;
            const delivered = utils.json.optionalLen(data.output, "$.data") ??
                0;
            return { counts: { row: delivered, search: 1 } };
        },
    },
});
