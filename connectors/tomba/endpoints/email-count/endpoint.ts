import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zEmailCountQueryParams } from "./schema/inputs.ts";

/** GET /email-count — how many addresses Tomba has for a domain. */
export default defineEndpoint({
    meta: {
        displayName: "Count Domain Emails",
        summary:
            "Count the email addresses Tomba has for a domain, by type, department, and seniority.",
        description: "Return how many email addresses Tomba has for one " +
            "domain: the total, the personal / generic split, per-" +
            "department counts (engineering, sales, marketing, executive, " +
            "and 17 more), and per-seniority counts (junior, senior, " +
            "executive). An unknown, webmail, or disposable domain returns " +
            "0 everywhere. Suited for sizing a target account before " +
            "running /domain-search.",
        docsUrl: "https://docs.tomba.io/api/finder#email-count",
        categories: ["people-enrichment"],
        notes: [
            "Every successful call costs 1 email count credit; when that " +
            "balance is used up the endpoint answers 429.",
        ],
    },
    request: { method: "GET", path: "/email-count" },
    input: {
        schema: {
            queryParams: zEmailCountQueryParams.required({ domain: true }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "email counts",
            consumes: { credit: "email_count", amount: 1 },
        },
    },
});
