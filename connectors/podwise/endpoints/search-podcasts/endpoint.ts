import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSearchPodcastsQueryParams } from "./schema/inputs.ts";

/**
 * GET /api/open/v1/podcasts/search — find podcasts (shows), not episodes.
 *
 * FREE: a lookup step. It returns show seqs for List Podcast Episodes; the
 * charge is on reading a summary or transcript.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Podcasts",
        summary: "Find a podcast show by name and get its id to list " +
            "episodes.",
        description: "Find a podcast show by name across nearly 30,000 " +
            'shows, e.g. "Dwarkesh Podcast". Returns the show\'s name, ' +
            "owner, cover, description, genre, latest publish time and the " +
            "`seq` to pass to List Podcast Episodes. Use this rather than " +
            "Search Podcast Episodes when you already know which show you " +
            "want. Up to 30 results per page. Free.",
        notes: [
            "Results are ordered by each show's latest episode, newest " +
            "first, not by relevance; check the name before using a seq.",
            "The same show can appear more than once (one entry per feed). " +
            "If two entries share a name, list both and prefer the one whose " +
            "episodes have transcribed: true.",
        ],
        docsUrl:
            "https://podwise.ai/docs/open-api-v1/discovery/search-podcasts",
        categories: ["podcasts"],
    },
    endpoint: "/podcasts/search",
    request: { method: "GET", path: "/api/open/v1/podcasts/search" },
    input: { schema: { queryParams: zSearchPodcastsQueryParams } },
    usage: {
        model: { kind: UsageModelKind.FREE },
    },
});
