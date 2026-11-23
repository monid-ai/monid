import { z } from "zod";

export const zV3EventsCalendarQueryParams = z.object({
    from: z.number().int().nonnegative().max(4_102_444_800).describe(
        "Unix seconds. Default 00:00 UTC today, or 30 days before `to` " +
            "when `to` is before 00:00 UTC today.",
    ).optional(),
    to: z.number().int().nonnegative().max(4_102_444_800).describe(
        "Unix seconds. Default 30 days after `from`.",
    ).optional(),
    entityIds: z.array(z.guid()).min(1).max(30).describe(
        "Up to 30 family or entity UUIDs from elfa#v3/entities. Matches " +
            "entries about any of them.",
    ).optional(),
    assetClass: z.enum(["crypto", "equity"]).describe(
        "Entries about an asset in this market, plus entries about no " +
            "asset (macro, conferences).",
    ).optional(),
    category: z.array(z.enum([
        "macro",
        "earnings",
        "unlock",
        "governance",
        "listing",
        "launch",
        "airdrop",
        "conference",
        "regulatory",
        "protocolUpgrade",
        "corporateAction",
        "marketResolution",
        "campaign",
        "expiry",
        "deadline",
        "geopolitics",
        "other",
    ])).min(1).max(17).describe("One or more categories.").optional(),
    status: z.array(z.enum([
        "scheduled",
        "rescheduled",
        "postponed",
        "cancelled",
        "past",
        "occurred",
    ])).min(1).max(6).describe(
        "One or more statuses. Default every status.",
    ).optional(),
    confidence: z.array(z.enum(["official", "reported", "rumored"])).min(1)
        .max(3).describe("One or more confidence levels.").optional(),
    minImportance: z.number().int().min(0).max(100).describe(
        "0 to 100. `80` keeps Key entries; postponed or cancelled ones " +
            "keep their score.",
    ).optional(),
    order: z.enum(["asc", "desc"]).describe(
        "Default `asc`, soonest first.",
    ).optional(),
    limit: z.number().int().min(1).max(30).describe(
        "Default 10, maximum 30.",
    ).optional(),
    cursor: z.string().min(1).describe(
        "`nextCursor` from the previous response.",
    ).optional(),
}).strict();
