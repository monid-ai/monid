import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zV3EventsQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Events",
        summary:
            "Analyzed market events from X and Telegram: what happened, to which asset, which way it cuts.",
        description: "What happened, to what, and when. Newest first, with a " +
            "cursor. Filter with `entityIds`: a family UUID for an asset, " +
            "or an entity UUID for a person, project or organisation. Or " +
            "fetch events you already hold with `eventIds`. `from` is " +
            "required unless `eventIds` or `q` is sent, and `to` defaults " +
            "to now. A range that starts before the plan's history is " +
            "cut, and `servedFrom` says where it started. `sort=relevant` " +
            "ranks the last 24 hours by how newsworthy each event is, " +
            "instead of newest first. It takes no range: `from`, `to`, " +
            "`eventIds`, `eventClass`, `eventType`, `implication`, " +
            "`novelty`, `arcId` and `order=asc` are refused with it, and " +
            "`entityIds` must be assets. Every page is ranked as of the " +
            "first, and `servedFrom` is null. `q` searches by topic " +
            "instead: events ranked by how closely they match it, best " +
            'first. Write a theme or a phrase ("stablecoin regulation in ' +
            'the US", "solana outage"); for everything about one asset or ' +
            "company, resolve it with elfa#v3/entities and pass " +
            "`entityIds`, since a bare ticker is a poor topic. `q` takes " +
            "`from` (optional, default the plan's history), `to`, " +
            "`entityIds`, `alertAction`, `eventType` and `hasStoryline`; " +
            "anything else is refused with it. A search serves its first " +
            "100 matches that clear a minimum relevance, so a query " +
            "nothing matches well returns an empty page, and a page can " +
            "be shorter than `limit` while more follow.",
        docsUrl: "https://docs.elfa.ai/api/v3/endpoints/list-events",
        categories: ["crypto-signals", "news-search", "equities"],
        notes: [
            "1 credit, plus 1 per event not already billed to the " +
            "platform's Elfa account within 8 days of its `analyzedAt`. A " +
            "`q` search adds no surcharge; returned objects are billed as " +
            "usual.",
            "`from` is required unless `eventIds` or `q` is sent. " +
            "`eventIds` takes no other filter. `q` refuses `eventCategory`, " +
            "and `q` and `sort=relevant` each refuse some other filters; " +
            "see the description.",
        ],
    },
    request: { method: "GET", path: "/v3/events" },
    input: {
        schema: {
            queryParams: zV3EventsQueryParams.extend({
                limit: zV3EventsQueryParams.shape.limit.unwrap().default(10),
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
                events: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "events",
                    description:
                        "events returned and not already billed to the platform's Elfa account within 8 days of its `analyzedAt`",
                    consumes: { credit: "default", amount: 1 },
                },
            },
        },
        estimate: ({ data }) => {
            const query = data.input.queryParams;
            const ids = query?.eventIds;
            return {
                counts: {
                    events: ids !== undefined && ids.length > 0
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
                ? model.components["events"]?.consumes.amount ?? 0
                : 0;
            const list = utils.json.optionalGet(data.output, "$.events");
            return {
                counts: {
                    events: typeof billed === "number" && rate > 0
                        ? billed / rate
                        : Array.isArray(list)
                        ? list.length
                        : 0,
                },
            };
        },
    },
});
