import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPrismDiscoverQuery } from "./schema/inputs.ts";

/**
 * GET /v1/prism/discover — search several platforms, keep a date window,
 * judge every row, drop duplicates.
 *
 * Metered. max_credits caps the run and defaults to 50; a documented
 * quick run spends about 8. The estimate holds the cap (or 0 on a dry
 * run). credits_used on this response settles the call. A request that
 * does not fit one call answers 202 and can still spend after the
 * response; that later spend is not in credits_used. See notes.
 */
export default defineEndpoint({
    meta: {
        displayName: "Discover",
        summary:
            "Search several platforms over a date window and get one judged, de-duplicated list.",
        description: "Search the platforms you name for a phrase, a list " +
            "of keywords, or a set of brands. Keeps the date window, " +
            "judges every row against your question, and drops duplicates. " +
            "A small request answers in the same call with the posts. A " +
            "large one continues in the background and answers 202 with a " +
            "run to follow at data.next.status_url. view=accounts returns " +
            "the accounts behind the topic instead of the posts. " +
            "depth=quick is the short version: a few fast platforms and " +
            "about 15 seconds. dry_run prices the plan and charges nothing. " +
            "Use a single platform's own search when you already know " +
            "which platform, and this when the question is who is talking " +
            "about a topic across several.",
        docsUrl: "https://www.socialcrawl.dev/docs/prism/discover",
        categories: [
            "instagram",
            "tiktok",
            "youtube",
            "linkedin",
            "twitter",
            "reddit",
            "news-search",
        ],
        notes: [
            "Metered. max_credits defaults to 50 and is the most the run " +
            "may spend. A documented quick run (depth=quick, one phrase, " +
            "a 90-day window) spends about 8 credits. dry_run is free.",
            "credits_used on this response is the bill. A 202 leaves out " +
            "work still running: data.run.credits.pending is the most " +
            "that can still be added, and this connector does not follow " +
            "the run. Copy data.next; do not build the run URL yourself.",
            "The call needs a subject: keywords, query, brands, or " +
            "another subject the discover guide lists. A call with none " +
            "is a free 400. label=mention needs brands. The schema does " +
            "not encode those pairs.",
            "A request answers in the call only when it is small: at " +
            "most 6 keywords, 36 platform searches, 3 pages per platform, " +
            "and not depth=deep. Anything larger answers 202 unless " +
            "async=false, which is a free 422.",
            "An identical request within 24 hours of a completed run " +
            "returns the stored result and costs 0. Set your client " +
            "timeout to deadline_s plus 10 seconds (50 by default, 25 " +
            "with depth=quick).",
            "Fields this schema does not list still pass through. The " +
            "vendor rejects an unknown field with a free 400 that names it.",
        ],
    },
    request: { method: "GET", path: "/v1/prism/discover" },
    input: { schema: { queryParams: zPrismDiscoverQuery } },
    /** deadline_s is at most 96, and the docs say to wait 10 seconds
     *  past it. A 202 returns before that. */
    timeouts: { requestMs: 120_000, runMs: 130_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "credits",
            description: "SocialCrawl credits_used. The hold is " +
                "max_credits, which defaults to 50.",
        },
        /** The cap is the only figure a pre-run promise can stand behind.
         *  The run spends some or all of it, and the receipt settles. */
        estimate: ({ data }) => {
            const q = data.input.queryParams;
            if (q.dry_run === true || q.dry_run === 1) return { counts: {} };
            const cap = typeof q.max_credits === "number" ? q.max_credits : 50;
            return { counts: { CREDIT: cap } };
        },
    },
});
