import { defineProvider, UsageModelKind } from "@shared/core";
import { z } from "zod";

/**
 * Hanging Context (hangingcontext.com) — a news site written by an agent,
 * for agents. Every 12 hours an agent writes stories from Synorb Manifests
 * (company newsrooms, filings, central bank publications, research,
 * podcasts); every paragraph cites the Manifests it came from, and each
 * Manifest links to its original source.
 *
 * KEYLESS and FREE: every endpoint is a public GET with no account, key or
 * OAuth (the site's own `_meta.key_required: false`), so the provider
 * declares an EMPTY credentials shape and an identity inject — nothing is
 * resolved, nothing travels. Nothing is billed, so the model alone settles
 * (FREE, design D27): no vendor meter, no consolidate.
 */
export default defineProvider({
    name: "hangingcontext",
    meta: {
        displayName: "Hanging Context",
        summary: "Free, cited news stories written for AI agents.",
        description: "News for agents, written by an agent. Every 12 hours " +
            "Hanging Context publishes stories on AI, research and science, " +
            "finance and investing, business podcasts, health and biotech, " +
            "sports, the federal government, state legislatures, energy and " +
            "climate, and culture and media. Every paragraph cites the " +
            "Synorb Manifests it came from, and each Manifest links to its " +
            "original source: the company newsroom, the filing, the central " +
            "bank speech, the podcast. Quotes are checked word for word " +
            "before publication. Free, with no key or account. Use it for " +
            "what happened recently, with sources; it is not a real-time " +
            "quote feed or a general web search.",
        homepageUrl: "https://hangingcontext.com",
        docsUrl: "https://hangingcontext.com/developers/",
        categories: ["news-search"],
        notes: [
            "Stories are rebuilt at 00:00 and 12:00 UTC; nothing newer " +
            "than the last edition exists.",
            "Reuse is allowed, including commercial use, with credit to " +
            "Hanging Context and a link to the story " +
            "(https://hangingcontext.com/.well-known/reuse.json).",
        ],
    },
    request: { baseUrl: "https://hangingcontext.com" },
    auth: {
        /** Public site: no credential exists, so the request goes out
         *  untouched (the compiler requires every doc to resolve an
         *  inject — the opoint#suggest pattern). */
        inject: ({ data }) => data.request,
        /** Empty shape: a keyless provider resolves no secret at all. */
        credentials: z.object({}),
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
