import { defineProvider } from "@shared/core";
import { zDatalegionCredentials } from "./schema/auth.ts";

/**
 * Data Legion (datalegion.ai) — person and company enrichment from
 * identifiers, ported from monid-services `adaptors/datalegion`. Two vendor
 * routes, `POST /person/enrich` and `POST /company/enrich`, sold as six
 * products: person Base or Premium, each with or without the
 * contact/demographic (PII) field group; company Base or Premium.
 *
 * SIX API KEYS (design D1). Monid holds one dedicated key per product, and
 * the KEY selects the product — Data Legion returns that product's fields
 * and bills that product's rate. The vendor has no tier parameter, and no
 * request or response field filter emulates a tier (v1 rule). So the
 * credential is ONE object holding all six keys, declared here, and WHICH
 * key rides the `API-Key` header is each endpoint's own `auth.inject`.
 * `presets.auth.header` reads `data.params.apiKey`, so the injects are
 * spelled inline (the contactout posture).
 *
 * BILLING (design D2). One credit per successful call (v1: `billedUnits` 1
 * on any 2xx), drawn from the pool of the key that made it — each key is
 * its own product account at its own contract rate (v1 price sheet
 * 2026-10-15, USD per call: person base/no-pii 0.013, base/pii 0.065,
 * premium/no-pii 0.052, premium/pii 0.104; company base 0.013, premium
 * 0.052). Those $/credit rates are the broker card's job, not the doc's.
 * A no-match answers 404, which the engine zero-bills as error-as-data.
 * The body carries no meter, so there is no `consolidate`, and the vendor
 * body rides out unchanged (no `fromResponse`, v1 parity).
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
            "or without contact and demographic (PII) fields; company " +
            "products choose Base firmographics or Premium workforce " +
            "analytics. Each product is priced separately.",
        homepageUrl: "https://datalegion.ai",
        docsUrl: "https://www.datalegion.ai/docs/api-reference/overview",
        categories: ["people-enrichment", "company-enrichment"],
        notes: [
            "Charged once per successful call; a lookup with no match " +
            "(HTTP 404) or an upstream error is free.",
            "Returns at most one match: multiple-result inputs are not " +
            "exposed.",
            "Available fields vary by matched record; completeness is not " +
            "guaranteed.",
        ],
    },
    auth: {
        /** All six keys, one credential (design D1). No provider inject:
         *  the products share two wire paths, so each endpoint states
         *  which key it sends. */
        credentials: zDatalegionCredentials,
    },
    request: { baseUrl: "https://api.datalegion.ai" },
    // mirrors services/workflows/endpointExecution/config.yml (datalegion):
    // request 30s, run 30s; no pollMs — every endpoint is sync.
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        /** One pool per product key (design D2) — each key is its own
         *  account. Declared once here; each compiled doc narrows to the
         *  pool its own line drains (pdl D6). */
        credits: {
            person_base_no_pii: {
                label: "Person Base (No PII) credits",
            },
            person_base_pii: { label: "Person Base (PII) credits" },
            person_premium_no_pii: {
                label: "Person Premium (No PII) credits",
            },
            person_premium_pii: { label: "Person Premium (PII) credits" },
            company_base: { label: "Company Base credits" },
            company_premium: { label: "Company Premium credits" },
        },
    },
});
