import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zExtractBody } from "./schema/inputs.ts";

/**
 * `POST /v1/extract`: read up to 20 pages live and return each page's main
 * text.
 *
 * Billing (https://specstream.ai/agents.md, 2026-11-14): $0.0008 for each
 * page read. A page that gives no text (a wrong address, a site that
 * refuses, an empty page) is not charged, so one call can cost less than
 * its estimate. The reply carries the dollars taken as `data.price_usd`;
 * that receipt settles (design D27). The estimate is every page asked for.
 */
export default defineEndpoint({
    meta: {
        displayName: "SpecStream Extract",
        summary: "Read up to 20 pages live and get each page's main text.",
        description:
            "Read pages you already know the address of. Send 1 to 20 " +
            "URLs and get one result for each, in the order sent: " +
            "`status` (`ok`, or the reason the page gave no text, such as " +
            "`invalid_url`), `title`, `text` (the main text as Markdown, " +
            "plain text or HTML, with navigation, ads and footers left " +
            "out), `published` (the page's date when it states one) and " +
            "the email addresses on the page. Web pages, PDF, Word and " +
            "Excel files are read. Every page is read live at the moment " +
            "of the call. Use it after `specstream#v1/web-search` to read " +
            "a result in full.",
        docsUrl: "https://specstream.ai/docs/extract-api",
        categories: ["web-scraping", "web-extraction"],
        notes: [
            "$0.0008 a page read ($0.80 per 1,000). A page that gives no " +
            "text is not charged. The reply states its own price in " +
            "`data.price_usd`.",
            "A page that fails does not fail the call: read each " +
            "result's `status`.",
        ],
    },
    request: { method: "POST", path: "/v1/extract" },
    input: { schema: { body: zExtractBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            label: "hundredths of a cent charged",
            description: "the price SpecStream states for the pages read " +
                "in `data.price_usd`, in hundredths of a cent: 8 for " +
                "each page that gave text",
            consumes: { credit: "default", amount: 0.0001 },
        },
        /** The vendor's own receipt. Omitted when absent, so the derived
         *  fold stands in. */
        consolidate: ({ data, utils }) => {
            const usd = utils.json.optionalNum(data.output, "$.data.price_usd");
            return {
                credits: { ...(usd !== undefined ? { default: usd } : {}) },
            };
        },
        /** Every page asked for; a page with no text is then not charged. */
        estimate: ({ data }) => ({
            counts: { "CREDIT": 8 * data.input.body.urls.length },
        }),
        evidence: ({ data, utils }) => ({
            counts: {
                "CREDIT": Math.round(
                    (utils.json.optionalNum(data.output, "$.data.price_usd") ??
                        0) * 10000,
                ),
            },
        }),
    },
});
