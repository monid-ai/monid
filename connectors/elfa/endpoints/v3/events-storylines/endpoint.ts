import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zV3EventsStorylinesQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Storylines",
        summary:
            "Developing stories: events grouped over time with a running summary.",
        description:
            "What is developing over time. A storyline is many events, " +
            "carries its summary and every event it shows by id, and goes " +
            "dormant after three quiet days. `q` searches storylines by " +
            "topic, best match first, across every status unless `status` " +
            "is sent; a more recently started storyline edges ahead of an " +
            "older match of similar relevance. Its `from` and `to` bound " +
            "when the title and summary were last rewritten (at or after " +
            "`lastMaterialAt`), rather than `lastEventAt`. It takes " +
            "`from` (optional, default the plan's history), `to`, " +
            "`entityIds` and `status`, and serves the first 100 matches " +
            "that clear a minimum relevance, none when nothing does; " +
            "`storylineIds`, `relation` and `order=asc` are refused with " +
            "it.",
        docsUrl: "https://docs.elfa.ai/api/v3/endpoints/list-storylines",
        categories: ["crypto-signals", "news-search", "equities"],
        notes: [
            "1 credit, plus 2 per storyline not already billed to the " +
            "platform's Elfa account that UTC day. A `q` search adds no " +
            "surcharge; returned objects are billed as usual.",
            "`from` is required unless `storylineIds` or `q` is sent.",
        ],
    },
    request: { method: "GET", path: "/v3/events/storylines" },
    input: {
        schema: {
            queryParams: zV3EventsStorylinesQueryParams.extend({
                limit: zV3EventsStorylinesQueryParams.shape.limit.unwrap()
                    .default(10),
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
                storylines: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "storylines",
                    description:
                        "storylines returned and not already billed to the platform's Elfa account that UTC day",
                    consumes: { credit: "default", amount: 2 },
                },
            },
        },
        estimate: ({ data }) => {
            const query = data.input.queryParams;
            const ids = query?.storylineIds;
            return {
                counts: {
                    storylines: ids !== undefined && ids.length > 0
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
                ? model.components["storylines"]?.consumes.amount ?? 0
                : 0;
            const list = utils.json.optionalGet(data.output, "$.storylines");
            return {
                counts: {
                    storylines: typeof billed === "number" && rate > 0
                        ? billed / rate
                        : Array.isArray(list)
                        ? list.length
                        : 0,
                },
            };
        },
    },
});
