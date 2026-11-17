import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import { aiBody } from "../../schema/ai.ts";
import { zNativeOutput } from "../../schema/common.ts";
import { scraperPoll, scraperStart } from "../../protocol.ts";

export default defineEndpoint({
    endpoint: "/ai/aimode",
    usage: {
        model: {
            kind: "COMPOSITE",
            components: {
                base: {
                    kind: "PER_CALL",
                    consumes: { credit: "default", amount: 0.0018 },
                    label: "answer",
                },
                shopping_enrichment: {
                    kind: "PER_UNIT",
                    unit: "RESULT",
                    consumes: { credit: "default", amount: 0.0018 },
                    label: "shopping enrichment",
                    description:
                        "One additional base charge when this answer returns shopping products, never per individual product. Public Docs rule; not a vendor invoice.",
                },
            },
        },
        estimate: ({ data, utils }) => {
            const actor = utils.json.optionalGet(
                data.input.body ?? null,
                "$.actor",
            );
            const shopping = utils.json.optionalGet(
                data.input.body ?? null,
                "$.input.shopping",
            );
            const enabled = shopping === true ||
                (shopping === undefined && actor !== "scraper.gemini");
            return { counts: { shopping_enrichment: enabled ? 1 : 0 } };
        },
        evidence: ({ data, utils }) => {
            const actor = utils.json.optionalGet(
                data.input.body ?? null,
                "$.actor",
            );
            const shopping = utils.json.optionalGet(
                data.input.body ?? null,
                "$.input.shopping",
            );
            const enabled = shopping === true ||
                (shopping === undefined && actor !== "scraper.gemini");
            const products = utils.json.optionalGet(
                data.output,
                "$.provider_response.task_result.products",
            );
            const enriched = Array.isArray(products) && products.length > 0;
            return {
                counts: {
                    shopping_enrichment:
                        enriched && (actor === "scraper.chatgpt" || enabled)
                            ? 1
                            : 0,
                },
            };
        },
    },
    meta: {
        displayName: "Google AI Mode AI Scraper",
        summary:
            "Collect Google AI Mode answers and available source references.",
        description:
            "Provide a prompt or the documented URL input. Public AI Mode search URLs and a complete shared-target URL have native successes. Short share.google/aimode links are expanded BEFORE task submission with at most three unauthenticated allowlisted Google redirect reads, preserving all share parameters. No substituted prompt or second POST; resolution failure creates no task. Internal raw_url failures remain retained, and not every Google URL is guaranteed. Returns the complete native task_result under provider_response, including result_text, result_md and result_html; citations and search_result. Submits once and polls the original task_id. Results expire four minutes after completion according to the current guide; fetch promptly. No documented upstream cancellation. The documented shopping-enrichment branch adds one base charge when extra product data is returned (2x total), never one charge per product. The catalog rate is not a per-task vendor invoice.",
        docsUrl:
            "https://docs.scrapeless.com/en/docs/ai-scraper/scrapers/google-ai-mode/",
        categories: ["web-search"],
    },
    request: {
        baseUrl: "https://api.scrapeless.com",
        method: "POST",
        path: "/api/v2/scraper/request",
    },
    input: { schema: { body: aiBody("aimode") } },
    output: { schema: zNativeOutput },
    timeouts: { requestMs: 30_000, runMs: 300_000, pollMs: 2_500 },
    lifecycle: {
        start: scraperStart,
        poll: scraperPoll,
        state: z.strictObject({
            consecutive_errors: z.number().int().nonnegative(),
        }),
    },
});
