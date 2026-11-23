import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zV3EventsArcsQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Narrative Arcs",
        summary:
            "Larger movements that group related storylines, with a summary.",
        description:
            "Storylines belonging to the same larger movement, with a " +
            "summary and every storyline by id. Reconciled hourly, and " +
            "most storylines never join one. By default, arcs by when " +
            "they last changed. `assetClass`, `entityIds` or `sort` read " +
            "the active narrative list instead: active arcs in a market " +
            "or about an asset, newest event first, or by how many " +
            "storylines or events they hold. That list holds active arcs " +
            "only, newest first, so it cannot be combined with `arcIds`, " +
            "`status=retired` or `order=asc`, and it starts at the plan's " +
            "history on the newest event. `q` searches arcs by topic, " +
            "best match first, within `status`. It serves the first 100 " +
            "matches that clear a minimum relevance; `arcIds`, " +
            "`assetClass`, `entityIds`, `sort` and `order=asc` are " +
            "refused with it.",
        docsUrl: "https://docs.elfa.ai/api/v3/endpoints/list-arcs",
        categories: ["crypto-signals", "news-search", "equities"],
        notes: [
            "1 credit, plus 2 per arc not already billed to the " +
            "platform's Elfa account that UTC day. A `q` search adds no " +
            "surcharge; returned objects are billed as usual.",
            "`assetClass`, `entityIds` and `sort` read active arcs only " +
            "and refuse `arcIds`, `status=retired` and `order=asc`.",
        ],
    },
    request: { method: "GET", path: "/v3/events/arcs" },
    input: {
        schema: {
            queryParams: zV3EventsArcsQueryParams.extend({
                limit: zV3EventsArcsQueryParams.shape.limit.unwrap().default(
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
                arcs: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "arcs",
                    description:
                        "arcs returned and not already billed to the platform's Elfa account that UTC day",
                    consumes: { credit: "default", amount: 2 },
                },
            },
        },
        estimate: ({ data }) => {
            const query = data.input.queryParams;
            const ids = query?.arcIds;
            return {
                counts: {
                    arcs: ids !== undefined && ids.length > 0
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
                ? model.components["arcs"]?.consumes.amount ?? 0
                : 0;
            const list = utils.json.optionalGet(data.output, "$.arcs");
            return {
                counts: {
                    arcs: typeof billed === "number" && rate > 0
                        ? billed / rate
                        : Array.isArray(list)
                        ? list.length
                        : 0,
                },
            };
        },
    },
});
