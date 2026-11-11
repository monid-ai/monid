import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zTechnologyQueryParams } from "./schema/inputs.ts";

/** GET /technology — the technologies a website uses (free). */
export default defineEndpoint({
    meta: {
        displayName: "Detect Website Technologies",
        summary:
            "List the technologies detected on a domain's website, with their categories.",
        description: "Return the technologies detected on a company's " +
            "website — analytics, live chat, CRM, payments, frameworks, " +
            "and more — each with its name, website, description, and " +
            "categories. When Tomba hasn't analyzed the domain before, it " +
            "detects them live (except on the Free plan). `data` is null " +
            "when Tomba has no technology data. Suited for technographic " +
            "targeting and competitive research.",
        docsUrl: "https://docs.tomba.io/api/domain#technology",
        categories: ["company-enrichment"],
        notes: [
            "Not charged, but the account needs a positive search balance.",
            "A live detection that fails returns 500 `internal_error`.",
        ],
    },
    request: { method: "GET", path: "/technology" },
    input: {
        schema: {
            queryParams: zTechnologyQueryParams.required({ domain: true }),
        },
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
