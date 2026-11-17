import { defineProvider, UsageModelKind } from "@shared/core";

/**
 * Datacircle (datacircle.dev) — a sheet of every GTM API plan, scored and
 * ranked, read through four GET endpoints against
 * `https://api.datacircle.dev/v1`. The API is open: no key, 60 calls a
 * minute from one address, so the provider declares no credentials and
 * usage is FREE (the same posture as tinyfish).
 */
export default defineProvider({
    name: "datacircle",
    meta: {
        displayName: "Datacircle",
        summary:
            "Find the best GTM APIs: every API, who is best for each, and every plan.",
        description: "Datacircle benchmarks all the GTM APIs and puts the " +
            "results on its website. List every API on the sheet, see who " +
            "is best for each, search every plan by API, provider or " +
            "price, and read one provider's ranks on every API.",
        homepageUrl: "https://datacircle.dev",
        docsUrl: "https://api.datacircle.dev/v1/openapi.json",
        categories: ["api-benchmarks"],
        notes: [
            "Open to anyone with no key: 60 calls a minute from one address.",
        ],
    },
    auth: { inject: ({ data }) => data.request },
    request: { baseUrl: "https://api.datacircle.dev/v1" },
    timeouts: { requestMs: 15_000, runMs: 20_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
});
