import { z } from "zod";

export const zV3EventsQueryParams = z.object({
    q: z.string().max(500).regex(/\S/).describe(
        "Topic to search for, up to 500 characters. Ranks by " +
            "relevance; see the endpoint description.",
    ).optional(),
    from: z.number().int().nonnegative().max(4_102_444_800).describe(
        "Unix seconds. Required unless `eventIds` or `q` is sent.",
    ).optional(),
    to: z.number().int().nonnegative().max(4_102_444_800).describe(
        "Unix seconds. Default now.",
    ).optional(),
    eventIds: z.array(z.guid()).min(1).max(30).describe(
        "Up to 30. An id we do not hold, or older than the plan's " +
            "history, is skipped.",
    ).optional(),
    eventClass: z.enum(["market", "asset", "call"]).describe(
        "What the event is about: the market at large, one asset, or " +
            "somebody's call.",
    ).optional(),
    eventType: z.enum([
        "security",
        "listing",
        "regulatory",
        "macro",
        "protocol",
        "company",
        "marketFlow",
        "price",
        "social",
        "other",
    ]).describe(
        "What kind of development it is. Anything the model cannot " +
            "place becomes `other`.",
    ).optional(),
    eventCategory: z.array(z.enum([
        "earnings",
        "analystRating",
        "corporateAction",
        "acquisition",
        "financing",
        "partnership",
        "product",
        "personnel",
        "plansAndMilestones",
        "ipo",
        "exchangeListing",
        "delisting",
        "tokenLaunch",
        "tokenomics",
        "governance",
        "flows",
        "marketMove",
        "metricsAndReports",
        "economy",
        "policy",
        "legal",
        "securityIncident",
        "outage",
        "geopolitics",
        "disaster",
        "commentary",
        "forecast",
    ])).min(1).max(27).describe(
        "What kind of thing happened, finer than `eventType`. One or " +
            "more; matches events in any of them, and combines with " +
            "`eventType` (`eventType=macro` with `eventCategory` " +
            "`economy` and `forecast`). An event with no category never " +
            "matches. Not with `q` or `eventIds`.",
    ).optional(),
    implication: z.enum(["bullish", "bearish", "mixed", "unclear"]).describe(
        "Which way the event cuts. On a call, derived from the side " +
            "taken.",
    ).optional(),
    entityIds: z.array(z.guid()).min(1).max(30).describe(
        "Up to 30 family or entity UUIDs. Matches events naming any " +
            "of them.",
    ).optional(),
    assetClass: z.enum(["crypto", "equity"]).describe(
        "Events naming an asset in this market, plus events that name " +
            "nothing we hold a family for (macro news), which match " +
            "either value. As more names are linked to assets, an event " +
            "can later drop out of one market.",
    ).optional(),
    novelty: z.enum(["new", "update"]).describe(
        "`new` skips second readings of a story already served.",
    ).optional(),
    alertAction: z.array(z.enum(["alert", "monitor"])).min(1).describe(
        "One or more.",
    ).optional(),
    sort: z.enum(["latest", "relevant"]).describe(
        "Default `latest`, newest first. `relevant` ranks the last 24 " +
            "hours.",
    ).optional(),
    hasStoryline: z.enum(["true", "false"]).describe(
        "`true` keeps events that belong to a storyline, `false` " +
            "those that do not.",
    ).optional(),
    arcId: z.guid().describe(
        "Events in one arc's storylines. Not with `sort=relevant`. An " +
            "arc id we do not hold is a 400.",
    ).optional(),
    notable: z.enum(["true", "false"]).describe(
        "`true` drops events a storyline marked as not material.",
    ).optional(),
    order: z.enum(["desc", "asc"]).describe(
        "`desc` (default) or `asc`.",
    ).optional(),
    limit: z.number().int().min(1).max(30).describe(
        "Default 10, maximum 30.",
    ).optional(),
    cursor: z.string().min(1).describe(
        "`nextCursor` from the previous response.",
    ).optional(),
}).strict();
