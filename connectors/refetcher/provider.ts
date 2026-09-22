import { defineProvider, presets, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";

export default defineProvider({
    name: "refetcher",
    meta: {
        displayName: "Refetcher",
        summary: "Public Instagram, TikTok, Facebook, X, and YouTube data.",
        description:
            "Fetch public social posts, videos, profiles, and YouTube " +
            "channels with normalized engagement metrics, metadata, and " +
            "available media links. Each tool reads one target and at most " +
            "one billable page. No social-platform login is required.",
        homepageUrl: "https://www.refetcher.com",
        docsUrl: "https://www.refetcher.com/docs",
        categories: ["web-scraping"],
        notes: [
            "The response retains Refetcher's envelope: inspect results[0].success and results[0].error as well as the HTTP status. A failed scrape costs zero.",
            "Each call accepts one target. Profile reads are limited to one page; YouTube channel reads return at most 12 uploads. Batch inputs, extra pagination parameters, and unknown fields are rejected.",
            "Unavailable metrics stay null or carry metricAvailability; they are not inferred. Source media URLs may expire. YouTube video media contains thumbnailUrl and embedUrl, not a downloadable videoUrl.",
            "Public list price checked 2026-09-22: USD 0.90 per 1,000 successful billable units (https://www.refetcher.com/pricing). Monid's customer pricing and provider account provisioning are separate hosted configuration.",
        ],
    },
    auth: { inject: presets.auth.header("X-API-Key") },
    request: { baseUrl: "https://api.refetcher.com" },
    input: {
        schema: {
            queryParams: z.strictObject({}),
            pathParams: z.strictObject({}),
        },
    },
    // An execution budget, not an advertised latency SLA. Upstream retries
    // may take longer than a single scrape; no connector-level retry is added.
    timeouts: { requestMs: 180_000, runMs: 180_000 },
    usage: {
        // Refetcher accounts hold USD, not a synthetic vendor credit currency.
        credits: { default: { label: "US dollars" } },
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0009 },
            label: "successful scrape",
            description:
                "One successful target with at most one returned page.",
        },
        // Every endpoint requires exactly one target and caps page multipliers.
        estimate: () => ({ counts: { RESULT: 1 } }),
        evidence: ({ data, utils }) => {
            const results = utils.json.get(data.output, "$.results");
            if (!Array.isArray(results) || results.length !== 1) {
                throw new Error("Expected exactly one Refetcher target result");
            }
            const success = utils.json.get(results[0], "$.success");
            if (typeof success !== "boolean") {
                throw new Error("Expected a boolean Refetcher result.success");
            }
            return { counts: { RESULT: success ? 1 : 0 } };
        },
        // No consolidate: public scrape responses do not carry a USD receipt.
    },
});
