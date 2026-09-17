import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zFontsQueryParams } from "./schema/inputs.ts";

/** GET /web/fonts — the typography a site uses. */
export default defineEndpoint({
    meta: {
        displayName: "Scrape Fonts",
        summary: "Detect the fonts a website uses, with usage statistics.",
        description: "Detect a site's typography so an application can " +
            "match brand fonts without manual inspection: font families in " +
            "use, their fallback stacks, where each family is applied, " +
            "element and word counts showing which face actually carries " +
            "the page, and font asset links when available. Useful for " +
            "on-brand document, deck, and email generation.",
        docsUrl:
            "https://docs.context.dev/api-reference/brand-intelligence/fonts",
        categories: ["web-extraction"],
    },
    request: { method: "GET", path: "/web/fonts" },
    // "domain or directUrl" bound as a union (clay D13; v1 `.refine`).
    input: {
        schema: {
            queryParams: z.union([
                zFontsQueryParams.required({ domain: true }),
                zFontsQueryParams.required({ directUrl: true }),
            ]).describe("Provide a domain or a directUrl."),
        },
    },
    usage: {
        /** 5 credits per call — https://www.context.dev/pricing
         *  (2026-09-17). */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "font scans",
            consumes: { credit: "default", amount: 5 },
        },
    },
});
