import { defineProvider, UsageModelKind } from "@shared/core";
import { z } from "zod";

/**
 * CompanyRegistryAPI.com (companyregistryapi.com) — free, keyless company
 * registry lookups powered by Coragrid. Two synchronous GET endpoints
 * against `https://api.companyregistryapi.com`, the public OpenAPI document
 * at https://companyregistryapi.com/api/openapi.json (read 2026-11-07).
 *
 * Keyless: the free API takes no key, so the credential shape is empty and
 * `auth.inject` returns the request untouched (nothing to inject). FREE on
 * the provider: no call is billed, there is no vendor meter, so neither
 * `usage.consolidate` nor quantities fns are declared.
 *
 * No `input.toRequest` and no `output.fromResponse`: the validated input
 * IS the wire request and the vendor body IS the output. Errors are RFC
 * 9457 problem documents (`type`, `title`, `status`, `detail`, `code`,
 * `retryable`, `request_id`), DATA with zero usage like every non-2xx.
 */
export default defineProvider({
    name: "companyregistryapi",
    meta: {
        displayName: "CompanyRegistryAPI.com",
        summary: "Free official company register lookup: search by name " +
            "or business ID, then read a company's registry profile.",
        description: "Free company registry lookup, powered by Coragrid. " +
            "Search official company registers by the start of a company " +
            "name or a business ID, optionally in one address country or " +
            "registration jurisdiction, then read one company's registry " +
            "profile by its permanent Coragrid id (co_...): status, legal " +
            "form in the register's own wording, registry identifiers " +
            "strongest first, activity classifications, lifecycle, " +
            "as_of_date and the latest register check. Names and registry " +
            "numbers change and repeat; the co_ id does not. Responses use " +
            "the same permanent IDs and field names as the Coragrid public " +
            "API.",
        homepageUrl: "https://companyregistryapi.com",
        docsUrl: "https://companyregistryapi.com/api",
        categories: ["company-enrichment", "government-data"],
        notes: [
            "Free and keyless. Rate limit: 60 requests per minute per " +
            "client address, with bursts up to the same number; above it " +
            "the API answers 429 `rate_limited`, whose `detail` (and " +
            "Retry-After header) names the seconds to wait. Wait that " +
            "long and retry at most twice.",
            "Errors are RFC 9457 problem documents with a stable `code` " +
            "(`invalid_request`, `not_found`, `rate_limited`, …) and a " +
            "`retryable` flag.",
            'Every success carries `attribution: "Powered by Coragrid"`. ' +
            "Show it wherever the data is displayed.",
            "Unknown and restricted values are absent, never filled in: " +
            "show a missing field as unknown, not as false or empty.",
        ],
    },
    auth: {
        credentials: z.object({}),
        inject: ({ data }) => data.request,
    },
    request: { baseUrl: "https://api.companyregistryapi.com" },
    timeouts: { requestMs: 15_000, runMs: 20_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
});
