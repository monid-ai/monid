import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zV3EventsCalendarQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Market Calendar",
        summary:
            "Scheduled launches, unlocks, votes, listings, earnings, macro releases and deadlines across crypto, equities and macro.",
        description: "What is scheduled: launches, unlocks, votes, listings, " +
            "earnings, data releases, rate decisions, hearings, conferences " +
            "and deadlines, across crypto, equities and macro. Soonest " +
            "first, with a cursor. Each entry keeps its schedule: `status` " +
            "says when it was moved, postponed or cancelled, and once it is " +
            "over, `outcome` names the event that reported it happened (read " +
            "it with elfa#v3/events and `eventIds`). Unlike the other lists, " +
            "the default range reads ahead: `from` defaults to 00:00 UTC " +
            "today (or 30 days before `to` when `to` is earlier) and `to` to " +
            "30 days after `from`. Both are inclusive, and an entry that " +
            "started earlier but is still running at `from` is listed too. " +
            "Entries reach about 400 days ahead. A `day` entry names a day, " +
            "not a moment: read `date`, which never shifts with a time zone. " +
            "`importance` scores how much widely held markets (BTC, ETH, " +
            "large caps, rates, FX) plan around the date; 80 and up, unless " +
            "postponed or cancelled, is a Key entry, about two a day.",
        docsUrl: "https://docs.elfa.ai/api/v3/endpoints/list-calendar",
        categories: ["crypto-signals", "equities", "events"],
        notes: [
            "1 credit, plus 1 per entry not already billed to the platform's " +
            "Elfa account that UTC day.",
        ],
    },
    request: { method: "GET", path: "/v3/events/calendar" },
    input: {
        schema: {
            queryParams: zV3EventsCalendarQueryParams.extend({
                limit: zV3EventsCalendarQueryParams.shape.limit.unwrap()
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
                entries: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "entries",
                    description:
                        "entries returned and not already billed to the platform's Elfa account that UTC day",
                    consumes: { credit: "default", amount: 1 },
                },
            },
        },
        estimate: ({ data }) => ({
            counts: { entries: data.input.queryParams?.limit ?? 0 },
        }),
        evidence: ({ data, utils }) => {
            const billed = utils.json.optionalGet(
                data.lifecycle?.state ?? null,
                "$.data.objects",
            );
            const model = data.usage.model;
            const rate = model.kind === "COMPOSITE"
                ? model.components["entries"]?.consumes.amount ?? 0
                : 0;
            const list = utils.json.optionalGet(data.output, "$.entries");
            return {
                counts: {
                    entries: typeof billed === "number" && rate > 0
                        ? billed / rate
                        : Array.isArray(list)
                        ? list.length
                        : 0,
                },
            };
        },
    },
});
