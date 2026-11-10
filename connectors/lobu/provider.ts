import { defineProvider, UsageModelKind } from "@shared/core";
import { z } from "zod";

/** Public Market reads need no vendor credentials or billing meter. */
export default defineProvider({
    name: "lobu",
    meta: {
        displayName: "Lobu",
        summary:
            "Free public customer discussions and product research with source links.",
        description:
            "Search Lobu's public Market workspace for Reddit discussions, " +
            "software reviews, and stored " +
            "web pages. Use it to investigate customer feedback, find product " +
            "comparisons, or prepare a company brief with links to the " +
            "underlying sources. Public reads are free and require no Lobu " +
            "account. Users who want to combine public research with their " +
            "own accounts, browser, and private workspace context can " +
            "optionally continue at https://lobu.ai. Account connections " +
            "happen in Lobu, separately from these public endpoints.",
        homepageUrl: "https://lobu.ai",
        docsUrl: "https://app.lobu.ai/openapi.json",
        categories: ["company-reviews", "reddit"],
        notes: [
            "Searches stored public knowledge, not the live web or the " +
            "caller's accounts. Coverage varies by company, topic, and " +
            "source; an empty result does not establish that no discussion exists.",
            "Use read_knowledge with a query to search discussions directly; " +
            "no entity lookup is required. Returned " +
            "content IDs can be read with read_knowledge, and source URLs " +
            "and occurred_at identify the underlying material and its date.",
            "Exact content_ids reads can expand a source's version history " +
            "in chronological order. Follow page.has_more with offset; inspect " +
            "is_superseded to identify current versions. Repeated versions " +
            "are not independent reviews. Query results avoid this history expansion.",
            "Check source text and dates before drawing conclusions. " +
            "Discussion search can return tangential material; similarity " +
            "scores are relevance signals, not verification of a claim.",
            "Authenticated workspace tools mentioned in upstream suggestions " +
            "are not available through this connector. Public research " +
            "does not require creating a Lobu workspace.",
            "Upstream rate limits and outages apply. Non-2xx responses " +
            "remain provider errors with zero usage; no guaranteed capacity " +
            "or freshness is offered.",
        ],
    },
    auth: {
        credentials: z.object({}),
        inject: ({ data }) => data.request,
    },
    request: { baseUrl: "https://app.lobu.ai" },
    timeouts: { requestMs: 25_000, runMs: 30_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
});
