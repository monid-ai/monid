import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCombinedFindQueryParams } from "./schema/inputs.ts";

/** GET /combined/find — person + company profiles from one email. */
export default defineEndpoint({
    meta: {
        displayName: "Enrich Person and Company",
        summary:
            "Look up a person's profile and their company's profile from one email address.",
        description: "One call, both profiles: resolve an email address " +
            "into the person (name, location, employment, social " +
            "handles) AND their company (industry codes, size, " +
            "headquarters, tech stack, funding) — the union of the " +
            "/people/find and /companies/find responses, at the same " +
            "price as either single call. An unknown address answers 404 " +
            "and costs nothing. Suited for qualifying an inbound email in " +
            "one hop.",
        docsUrl: "https://hunter.io/api-documentation/v2#combined-enrichment",
        categories: ["people-enrichment"],
        notes: ["A miss (404) costs nothing."],
    },
    request: { method: "GET", path: "/combined/find" },
    input: { schema: { queryParams: zCombinedFindQueryParams } },
    usage: {
        /** 0.2 credit flat — not 0.2 + 0.2 — v1's drill (design D3). */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "profiles",
            consumes: { credit: "default", amount: 0.2 },
        },
    },
});
