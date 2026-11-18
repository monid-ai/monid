import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zPhishingCheckQueryParams } from "./schema/inputs.ts";

/**
 * GET /phishing/check — blocklist verdict for a link or domain without
 * opening it. $0.002 per check.
 */
export default defineEndpoint({
    meta: {
        displayName: "Glyphcall Phishing Check",
        summary:
            "Is this link or domain on a phishing blocklist? Checked without opening it.",
        description: "Looks the link's host and every parent domain up " +
            "in two public phishing blocklists — Phishing.Database " +
            "(about 390,000 active phishing hosts) and MetaMask's " +
            "eth-phishing-detect (about 120,000 crypto scam domains) — " +
            "and flags one-letter look-alikes of brands MetaMask " +
            "watches. Returns verdict block, warn or not_listed with " +
            "the matching list, the matched domain and the list date. " +
            "The link is never requested, so it is safe on a live " +
            "phishing URL and fast enough for long lists. Will not: " +
            "judge a page that is on neither list; use " +
            "glyphcall#pack/url-safety to also follow redirects and " +
            "read the domain's age.",
        docsUrl: "https://glyphcall.com/tools/phishing-check",
        categories: ["web-security"],
        notes: ["$0.002 per check. Refused inputs are free."],
    },
    request: { method: "GET", path: "/phishing/check" },
    input: {
        schema: {
            queryParams: zPhishingCheckQueryParams.extend({
                url: zPhishingCheckQueryParams.shape.url.min(3).max(2000),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "check",
            consumes: { credit: "default", amount: 0.002 },
        },
    },
});
