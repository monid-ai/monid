import { defineProvider, presets } from "@shared/core";

/**
 * Datahyena (datahyena.com) — company events: funding rounds, acquisitions
 * and mergers, executive moves and hiring signals, each dated and attached to
 * a resolved company. Every endpoint is ONE synchronous GET against
 * `https://api.datahyena.com/v1`, auth `X-API-Key: <key>`, envelope
 * `{success, data, pagination?, meta}`.
 *
 *   - `usage.consolidate`: the vendor meter is ONE credit system, 1 credit per
 *     record returned. Every response stamps its own draw in
 *     `meta.creditsUsed`; the claim is plucked and the account-level
 *     `meta.creditsRemaining` stripped beside it, so billing facts never
 *     reach the output.
 *   - `usage.evidence`: list routes return the rows as the `data` array, so
 *     the count is its length; the single-company profile returns one object
 *     and counts as one call.
 */
export default defineProvider({
    name: "datahyena",
    meta: {
        displayName: "Datahyena",
        summary: "Company events: funding rounds, acquisitions, executive " +
            "moves and hiring signals.",
        description: "Company event data for agents: funding rounds with " +
            "amount, round, date and investors; acquisitions and mergers " +
            "with acquirer, target and deal value; executive appointments, " +
            "promotions and departures; and hiring signals read from " +
            "companies' own job boards (leadership openings, founding " +
            "roles, team build-outs, technology hiring). Every event is " +
            "deduplicated, dated by its announcement and attached to a " +
            "resolved company with domain, LinkedIn page, country, industry " +
            "and headcount. Filter by date, round, amount, country, " +
            "industry, vertical, NAICS and headcount; 1 credit per record " +
            "returned, and an empty result is free.",
        homepageUrl: "https://datahyena.com",
        docsUrl: "https://datahyena.com/docs",
        categories: ["funding-data", "company-news"],
    },
    auth: { inject: presets.auth.header("X-API-Key") },
    request: { baseUrl: "https://api.datahyena.com/v1" },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        credits: { default: { label: "Datahyena credits" } },
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.meta.creditsUsed",
            );
            return {
                credits: {
                    ...(typeof value === "number" ? { default: value } : {}),
                },
                output: utils.json.omit(rest, ["creditsRemaining"]),
            };
        },
        evidence: ({ data }) => {
            if (data.usage.model.kind !== "PER_UNIT") return { counts: {} };
            const envelope = data.output;
            const rows = envelope !== null && typeof envelope === "object" &&
                    !Array.isArray(envelope)
                ? envelope.data
                : undefined;
            return {
                counts: {
                    [data.usage.model.unit]: Array.isArray(rows)
                        ? rows.length
                        : 0,
                },
            };
        },
    },
});
