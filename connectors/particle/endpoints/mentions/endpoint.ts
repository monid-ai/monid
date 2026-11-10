import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zMentionsQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/podcasts/mentions — every line that mentions a person or company.
 * $0.015 per call (particle.pro/pricing, Endpoint List Prices, Individual column, 2026-10-29): overrides the amount.
 */
export default defineEndpoint({
    meta: {
        displayName: "Find Entity Mentions",
        summary: "Every line of podcast dialogue that mentions a person or " +
            "company, grouped by episode, newest first.",
        description: "Pull every line of dialogue across 160,000+ podcasts " +
            "that mentions a person or company — by entity slug, or by " +
            "company slug, domain or ID — grouped by episode and ordered " +
            "by recency, popularity or strength. Each result is one " +
            "episode with all of its mention windows: a contiguous range " +
            "of dialogue around the mention with context_lines of " +
            "surrounding lines, speaker names on every line, and " +
            "is_mention on the lines that carry it. Narrow to one " +
            "podcast, publisher or episode, to a role (guest, host, " +
            "mention), to a date window, or to mentions spoken by guests " +
            "of a given occupation, field, standing or seniority. Ad " +
            "reads are excluded unless include_ads=true. Resolve a name " +
            "to its slug first with particle#v1/entities/search.",
        docsUrl:
            "https://docs.particle.pro/api-reference/podcast-episode-search/search-podcast-dialogue-for-entity-mentions",
        categories: ["podcasts"],
        notes: [
            "Pass entity_id or company_id (one is required); without " +
            "either the vendor answers 400 and the call is not billed.",
            "The speaker_statement_characteristics[...] filter (e.g. " +
            "sentiment=negative for criticism) is not exposed here.",
        ],
    },
    request: { method: "GET", path: "/v1/podcasts/mentions" },
    input: { schema: { queryParams: zMentionsQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 0.015 },
        },
    },
});
