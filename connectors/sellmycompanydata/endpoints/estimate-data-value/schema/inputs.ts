import { z } from "zod";

/**
 * Arguments for MCP tool `estimate_data_value`, mirrored from the server's
 * published `tools/list` inputSchema (server v1.1.0, read 2026-10-29). The
 * server publishes `additionalProperties: false` at both levels, so both
 * objects are strict: a misspelled key fails before the call, and a caller
 * cannot add a tool name. No defaults. The server also caps `founded_year`
 * and `since_year` at the current year; JSON Schema cannot say that, so the
 * server enforces it (an in-band refusal, settled as a provider error).
 */
const zSystem = z.object({
    tool: z.string().min(1).max(80).describe(
        "Product name, for example Slack, HubSpot, Zendesk, Notion, GitHub.",
    ),
    category: z.enum([
        "chat",
        "crm",
        "support",
        "docs",
        "code",
        "email",
        "project",
        "finance",
        "other",
    ]).describe("What kind of system it is."),
    since_year: z.number().int().min(1980).describe(
        "Year of the oldest data in this system, 1980 to the current year.",
    ).optional(),
    volume: z.string().max(120).describe(
        'Short count such as "40k messages", "12k tickets", "8k contacts". ' +
            "Numbers only, no content.",
    ).optional(),
    people: z.number().int().min(0).max(1_000_000).describe(
        "Number of people who use it or appear in it.",
    ).optional(),
    exportable: z.enum(["yes", "no", "unsure"]).describe(
        "Whether the owner can export the data.",
    ).optional(),
    measured: z.boolean().describe(
        "true if the figure is a measured count, false if it is an estimate " +
            "provided by the user.",
    ).optional(),
}).strict();

export const zEstimateDataValueArgs = z.object({
    employees: z.number().int().min(1).max(1_000_000).describe(
        "Approximate number of staff.",
    ),
    founded_year: z.number().int().min(1800).describe(
        "Year the company was founded, 1800 to the current year.",
    ),
    country: z.enum(["us", "ca", "uk", "eu", "anz", "other"]).describe(
        "Where the company is based: us, ca (Canada), uk, eu, anz (Australia " +
            "or New Zealand), other.",
    ),
    systems: z.array(zSystem).max(30).describe(
        "One entry per system that holds company data. May be empty if " +
            "unknown.",
    ),
    slack_public_share: z.enum(["most", "half", "little", "unsure", "no_slack"])
        .describe(
            "Share of Slack channels that are public. The value no_slack " +
                "means the company does not use Slack.",
        ).optional(),
}).strict();
