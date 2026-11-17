import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * CaptureKit (www.capturekit.dev). Synchronous GET endpoints against
 * `https://api.capturekit.dev`, auth the `x-api-key` header.
 *
 * Billing: CaptureKit bills 1 credit per successful request on each
 * endpoint here (published pricing; measured in the Treg catalog run,
 * 2026-11-09). No response carries a usage receipt, so the derived fold
 * settles.
 */
export default defineProvider({
    name: "capturekit",
    meta: {
        displayName: "CaptureKit",
        summary:
            "Any web page as clean Markdown, an AI summary of a website, or its raw HTML.",
        description:
            "A page capture API: render a public page in a browser and get " +
            "its content as Markdown with its metadata and links, an AI " +
            "analysis of the website (summary, value proposition, features, " +
            "use cases), or the raw HTML. Use it when an agent needs to read " +
            "a page as text.",
        homepageUrl: "https://www.capturekit.dev",
        docsUrl: "https://docs.capturekit.dev",
        categories: ["web-scraping", "web-extraction"],
    },
    auth: { inject: presets.auth.header("x-api-key") },
    request: { baseUrl: "https://api.capturekit.dev" },
    timeouts: { requestMs: 120_000, runMs: 120_000 },
    usage: {
        /** THE credit system (design D26): one pool, the vendor's own
         *  credits. No `consolidate`: no response carries a receipt. */
        credits: { default: { label: "CaptureKit credits" } },
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
