import { defineProvider, presets } from "@shared/core";

/**
 * Scraper (scraper.run): structured data from public job boards and
 * review sites, one POST per tool over `https://scraper.run/api/v1/tools`
 * with `Authorization: Bearer sc_live_...`. This connector ships the job
 * tools: Indeed, LinkedIn, Glassdoor, Naukri, and Upwork.
 *
 * Billing: one pool of Scraper credits (1 credit = $0.001 on every plan,
 * https://scraper.run). Each tool states its own draw in the docs (1 or 2
 * credits per call; Indeed companies bill per started block of 25
 * requested profiles; Naukri search adds 1 credit with `fetchDetails`).
 * Every success envelope carries the vendor's own meter,
 * `meta.creditsUsed`, so the provider lifts it in `consolidate` and each
 * endpoint's rate card is the cross-check.
 *
 * Vendor non-2xx is DATA: errors arrive as an RFC-9457-style problem body
 * `{type, status, code, message, requestId, retryable}`, which
 * `output.fromError` normalizes here.
 */
export default defineProvider({
    name: "scraper",
    meta: {
        displayName: "Scraper",
        summary: "Structured job, company, and salary data from Indeed, " +
            "LinkedIn, Glassdoor, Naukri, and Upwork.",
        description: "Live, structured data from public job boards as JSON, " +
            "with no HTML to parse: Indeed jobs and company profiles, " +
            "LinkedIn jobs and job details, Glassdoor jobs, company " +
            "profiles, reviews, salaries, interviews, and benefits, " +
            "Naukri jobs for India, and Upwork freelance jobs. Every tool " +
            "scrapes the source live. One API key and one credit pool " +
            "across all tools, at 1 or 2 credits per call. The free plan " +
            "includes credits at https://scraper.run.",
        homepageUrl: "https://scraper.run",
        docsUrl: "https://scraper.run/docs",
        categories: ["jobs"],
        notes: [
            "Every call scrapes the source site live, so latency is " +
            "seconds to tens of seconds, and a call can fail with " +
            "browser_timeout (502) or browser_capacity_exceeded (503); " +
            "both are retryable.",
            "A non-2xx response draws no credits and settles as a " +
            "provider error: 400 bad_request, 401 unauthorized, " +
            "402 no_credits, 429 rate_limited. Rate limits are per API " +
            "key: the free plan allows 10 requests a minute with 1 call " +
            "in flight, the Pro plan 120 and 5.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://scraper.run/api/v1/tools" },
    timeouts: { requestMs: 120_000, runMs: 120_000 },
    usage: {
        /** THE credit system (design D26): Scraper meters ONE pool of
         *  credits per account, drawn by every tool. */
        credits: { default: { label: "Scraper credits" } },
        /** The vendor's OWN claim (design D27): every success envelope
         *  reports `meta.creditsUsed`. Pluck it (read + strip, one motion)
         *  and entry OMITTED when the meter is absent (never `?? 0`). */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.meta.creditsUsed",
            );
            return {
                credits: {
                    ...(typeof value === "number" ? { default: value } : {}),
                },
                output: rest,
            };
        },
    },
    output: {
        /** Problem-details body: `message` is the readable text, `code`
         *  the stable machine id (bad_request, no_credits, ...). */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(data.output, "$.message");
            const code = utils.json.optionalGet(data.output, "$.code");
            const text = [message, code].find((v) =>
                typeof v === "string" && v !== ""
            );
            return {
                message: typeof text === "string" ? text : "Scraper error",
                raw: data.output,
            };
        },
    },
});
