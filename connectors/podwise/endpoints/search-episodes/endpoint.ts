import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSearchEpisodesQueryParams } from "./schema/inputs.ts";

/**
 * GET /api/open/v1/episodes/search — find episodes by topic.
 *
 * BILLED PER CALL ($0.006). This is the discovery step: it returns episode
 * seqs to feed into the summary and transcript endpoints.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Podcast Episodes",
        summary: "Find podcast episodes by topic, guest or company.",
        description: "Search the Podwise episode index by topic, guest " +
            'or company (160,000+ episodes have transcripts), e.g. "Sam ' +
            'Altman interview", "GLP-1 drugs". Newest first, so it is good ' +
            'for "what are podcasts saying about X lately". Returns title, ' +
            "show, publish date, duration, language, show notes, audio link, " +
            "whether a transcript is ready (`transcribed`), and the `seq` id " +
            "to pass to the podcast summary and transcript endpoints. 20 " +
            "results per page by default, up to 30. To find a specific show, use Search " +
            "Podcasts.",
        notes: [
            "Matches episode titles and show notes, not the AI summary or " +
            "the transcript text.",
            "Results come newest first, not by relevance.",
            "Results include episodes that are not transcribed; only those " +
            "with transcribed: true can be read through this provider.",
        ],
        docsUrl:
            "https://podwise.ai/docs/open-api-v1/discovery/search-episodes",
        categories: ["podcasts"],
    },
    endpoint: "/episodes/search",
    request: { method: "GET", path: "/api/open/v1/episodes/search" },
    input: { schema: { queryParams: zSearchEpisodesQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.006 },
            label: "episode search",
            description: "one search request",
        },
    },
});
