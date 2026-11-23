import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zV3CallsEpisodesQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Call Episodes",
        summary:
            "One account's position on one asset from open to close, with the caller's track record.",
        description:
            "One account's position on one asset, from the call that " +
            "opened it to whatever closed it, with its calls by id. An " +
            "episode is served when it was open at any point between " +
            "`from` and `to`, not only when it opened in that range. " +
            "`calls` lists only the calls inside the plan's history (the " +
            "ones elfa#v3/calls serves when no `from` is given), so a " +
            "position opened before it can come back with fewer calls, or " +
            "none. Its position facts (`openedAt`, `entryPrice`, " +
            "`direction`, `status`, and how it closed) are kept. Each " +
            "episode also carries the opening call's `setup`, `thesis` " +
            "and stated target and stop, all null when that call is older " +
            "than the plan's history, and `track`: the author's record " +
            "over every position they have opened (alpha score, hit rate, " +
            "average return), in every market and not cut to the plan's " +
            "history.",
        docsUrl: "https://docs.elfa.ai/api/v3/endpoints/list-call-episodes",
        categories: ["crypto-signals", "equities"],
        notes: [
            "1 credit, plus 2 per position not already billed to the " +
            "platform's Elfa account in its current status in the last 90 " +
            "days, so a position bills again once when it closes.",
            "`from` is required unless `episodeIds` is sent.",
        ],
    },
    request: { method: "GET", path: "/v3/calls/episodes" },
    input: {
        schema: {
            queryParams: zV3CallsEpisodesQueryParams.extend({
                limit: zV3CallsEpisodesQueryParams.shape.limit.unwrap().default(
                    10,
                ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                request: {
                    kind: UsageModelKind.PER_CALL,
                    label: "request",
                    consumes: { credit: "default", amount: 1 },
                },
                episodes: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "positions",
                    description:
                        "positions returned and not already billed to the platform's Elfa account in its current status in the last 90 days",
                    consumes: { credit: "default", amount: 2 },
                },
            },
        },
        estimate: ({ data }) => {
            const query = data.input.queryParams;
            const ids = query?.episodeIds;
            return {
                counts: {
                    episodes: ids !== undefined && ids.length > 0
                        ? ids.length
                        : query?.limit ?? 0,
                },
            };
        },
        evidence: ({ data, utils }) => {
            const billed = utils.json.optionalGet(
                data.lifecycle?.state ?? null,
                "$.data.objects",
            );
            const model = data.usage.model;
            const rate = model.kind === "COMPOSITE"
                ? model.components["episodes"]?.consumes.amount ?? 0
                : 0;
            const list = utils.json.optionalGet(data.output, "$.episodes");
            return {
                counts: {
                    episodes: typeof billed === "number" && rate > 0
                        ? billed / rate
                        : Array.isArray(list)
                        ? list.length
                        : 0,
                },
            };
        },
    },
});
