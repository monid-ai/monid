import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zEmailFormatQueryParams } from "./schema/inputs.ts";

/** GET /email-format — the address patterns a domain uses. */
export default defineEndpoint({
    meta: {
        displayName: "Get Domain Email Formats",
        summary:
            "Get the formats a domain's email addresses follow, such as {first}.{last}, with their share.",
        description: "Return the patterns a domain uses to build email " +
            "addresses — such as {first}.{last}, {f}{last}, or {first} — " +
            "each with the percentage of known addresses that use it. " +
            "`data` is an empty array when Tomba has no formats for the " +
            "domain. Suited for guessing a person's address before " +
            "verifying it, or for checking a pattern at scale.",
        docsUrl: "https://docs.tomba.io/api/finder#email-format",
        categories: ["people-enrichment"],
        notes: [
            "Every successful call costs 1 email count credit, including " +
            "an empty result; when that balance is used up the endpoint " +
            "answers 429.",
        ],
    },
    request: { method: "GET", path: "/email-format" },
    input: {
        schema: {
            queryParams: zEmailFormatQueryParams.required({ domain: true }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "format lookups",
            consumes: { credit: "email_count", amount: 1 },
        },
    },
});
