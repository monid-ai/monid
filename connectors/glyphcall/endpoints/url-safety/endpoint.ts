import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zUrlSafetyQueryParams } from "./schema/inputs.ts";

/** GET /pack/url-safety — $0.01 per successful call; errors are free. */
export default defineEndpoint({
    meta: {
        displayName: "Glyphcall URL Safety Check",
        summary:
            "Is this link safe to open or pay? Redirects, domain age, phishing lists and HTTPS in one call.",
        description:
            "Checks a link before an agent opens or pays it: both phishing " +
            "blocklists (Phishing.Database, MetaMask) on every host it passes " +
            "through, each redirect hop and the final URL, the destination domain's " +
            "age, registrar and trust flags, HTTPS and security headers, and named " +
            "risk signals (days-old domain, bare IP host, punycode look-alike, " +
            "user@host trick, chains across many hosts), with an overall risk of " +
            "low, medium or high. Will not: render JavaScript or log in. For the " +
            "blocklist verdict alone without requesting the link, use " +
            "glyphcall#phishing/check.",
        docsUrl: "https://glyphcall.com/tools/pack-url-safety",
        categories: ["web-security"],
        notes: [
            "$0.01 per successful call. Refused inputs and unanswered sources are free.",
        ],
    },
    request: { method: "GET", path: "/pack/url-safety" },
    input: { schema: { queryParams: zUrlSafetyQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "check",
            consumes: { credit: "default", amount: 0.01 },
        },
    },
});
