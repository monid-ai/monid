import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zWebBacklinksBody } from "./schema/inputs.ts";

/**
 * Mindcase `web/backlinks`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Web Backlinks",
        summary: "Backlinks pointing at a domain, with source URL and title, " +
            "target URL, anchor text and authority scores. Pass the " +
            "domains.",
        description:
            "Backlinks pointing at a domain, with source URL and title, " +
            "target URL, anchor text and authority scores. Pass the " +
            "domains. Returns one row per backlink with domain, " +
            "sourceUrl, sourceTitle, targetUrl, anchor, " +
            "sourceAuthorityScore, pageAuthorityScore, firstSeen, " +
            "lastSeen, nofollow, sponsored, ugc, linkType, linkPosition, " +
            "imageUrl, sitewide, isNew, isLost, lostReason, " +
            "sourceLanguage, sourceExternalLinks, sourceInternalLinks. " +
            "For keyword difficulty and the top-ranking pages use " +
            "mindcase#ahrefs/serp-overview; for traffic estimates use " +
            "mindcase#similarweb/traffic. $0.008 per backlink; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/web/backlinks",
        categories: ["seo"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/web/backlinks",
    request: { method: "POST", path: "/v1/data/web/backlinks/run" },
    input: {
        schema: {
            body: zWebBacklinksBody.extend({
                maxResults: zWebBacklinksBody.shape.maxResults.unwrap().min(1)
                    .default(20).describe(
                        "How many backlinks to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.008 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
