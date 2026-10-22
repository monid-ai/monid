import { defineProvider, presets } from "@shared/core";

/**
 * Data Legion (datalegion.ai) — person and company enrichment from
 * identifiers. Two vendor routes, `POST /person/enrich` and
 * `POST /company/enrich`, each surfaced as tiered products: person Base or
 * Premium, with or without the contact/demographic (PII) field group;
 * company Base or Premium. Data Legion's own product split, as its docs
 * describe it. The vendor has no tier parameter — every product is the
 * same route with a field filter (see each endpoint).
 *
 * Auth is the `API-Key` header (docs.datalegion.ai OpenAPI).
 *
 * Usage: Data Legion meters CREDITS — "1 credit = 1 record returned", and
 * a lookup with no match costs nothing (datalegion.ai/pricing). Person and
 * company records draw from separate credit types, so the provider
 * declares one pool for each. Every product draws 1 credit per returned
 * match; the public pricing names no per-tier difference.
 *
 * Settle: the response's `matches` array is the evidence (a single-result
 * call returns 0 or 1); a no-match answers 404, which is data, zero-billed.
 * The `Credits-Used` response header is not read: hooks see the body only.
 */
export default defineProvider({
    name: "datalegion",
    meta: {
        displayName: "Data Legion",
        summary: "Person and company enrichment from identifiers.",
        description: "Enrich a person from an email, phone, social profile " +
            "URL, LinkedIn id, or name plus context, and a company from a " +
            "domain, name, LinkedIn id, social URL, or ticker. Person " +
            "products choose Base or Premium professional attributes, with " +
            "or without contact and demographic fields; company products " +
            "choose Base firmographics or Premium workforce analytics.",
        homepageUrl: "https://www.datalegion.ai",
        docsUrl: "https://www.datalegion.ai/docs/api-reference/overview",
        categories: ["people-enrichment", "company-enrichment"],
    },
    auth: { inject: presets.auth.header("API-Key") },
    request: { baseUrl: "https://api.datalegion.ai" },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        credits: {
            person: { label: "Data Legion person credits" },
            company: { label: "Data Legion company credits" },
        },
        /** One single-result call is at most one record. */
        estimate: () => ({ counts: { "RESULT": 1 } }),
        /** Records returned — the vendor's own billing basis. */
        evidence: ({ data, utils }) => ({
            counts: {
                "RESULT": utils.json.optionalLen(data.output, "$.matches") ?? 0,
            },
        }),
    },
});
