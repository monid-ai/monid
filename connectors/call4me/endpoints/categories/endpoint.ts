import { defineEndpoint, UsageModelKind } from "@shared/core";

/** `GET /api/requirements` — the kinds of call call4me places. */
export default defineEndpoint({
    meta: {
        displayName: "call4me Call Categories",
        summary:
            "List the kinds of phone call call4me places (category slugs).",
        description:
            "List the kinds of call call4me places, each with its slug, " +
            "name and examples: medical, dental, restaurant, veterinary, " +
            "auto service, auto sales, home services, personal care, home " +
            "internet (new service or existing account), flight changes " +
            "and general questions for a business. Each category decides " +
            "what must be known before dialing; read that with " +
            "call4me#requirements/{category}, then place the call with " +
            "call4me#calls. Free.",
        docsUrl: "https://call4.me/api/openapi.json",
        categories: ["agentic-phone"],
    },
    request: { method: "GET", path: "/requirements" },
    timeouts: { requestMs: 15_000, runMs: 20_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
});
