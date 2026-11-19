import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * Glyphcall (glyphcall.com, the Agent Data Tools API) — checks an agent
 * runs over a list of links or companies before it opens, pays or
 * onboards them: phishing blocklists and URL safety, EU VAT numbers
 * through VIES, an EU KYB company check, the Swedish company register,
 * and sanctions screening of names and crypto addresses.
 *
 * Authenticated REST against `https://api.glyphcall.com`, one GET per
 * check, `Authorization: Bearer <key>` (prepaid key, `adt_...`). Prices
 * are in US dollars per successful call and are the same for every key;
 * a refused input (4xx) or a source that did not answer (5xx) is not
 * charged by the vendor, so it bills 0 here too (the engine bills only
 * success). Each endpoint pins its own dollar price (`usage.model`);
 * the provider default is the commonest one, $0.01.
 *
 * Errors are JSON `{error, ...}`; `output.fromError` reads `error`. A missing or\n * unknown key is answered 402 Payment required (the same tool also takes\n * per-call x402 payments), never billed.
 */
export default defineProvider({
    name: "glyphcall",
    meta: {
        displayName: "Glyphcall",
        summary: "Checks to run over lists before an agent opens, pays or " +
            "onboards: phishing blocklists, URL safety, EU VAT, KYB, " +
            "Swedish company register, sanctions screening.",
        description: "One GET per check, JSON answers, no rate limit on " +
            "the vendor's side, failed calls free. Links: a phishing " +
            "blocklist verdict without opening the link ($0.002) or a " +
            "full URL safety check that follows every redirect hop " +
            "and reads the domain's age and trust flags ($0.01). " +
            "Companies: EU VAT numbers validated live against the " +
            "European Commission's VIES ($0.01), a KYB check that " +
            "finds a company in EU registers by name, VAT number or " +
            "LEI ($0.02), and the Swedish Bolagsverket register by " +
            "organisation number or name ($0.01). Screening: a person, " +
            "company or crypto address against the OFAC SDN list and " +
            "the EU, UN and UK lists ($0.009).",
        homepageUrl: "https://glyphcall.com",
        docsUrl: "https://api.glyphcall.com/openapi.json",
        categories: ["web-security", "compliance", "company-enrichment"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.glyphcall.com" },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        /** The vendor prices in dollars, so the pool is dollars (the
         *  exa / keenable posture). Endpoints override the amount. */
        credits: { default: { label: "US dollars" } },
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 0.01 },
        },
    },
    output: {
        /** `{error: "...", code?: "..."}` on every non-2xx. */
        fromError: ({ data, utils }) => {
            const error = utils.json.optionalGet(data.output, "$.error");
            return {
                message: typeof error === "string" && error !== ""
                    ? error
                    : "Glyphcall error",
                raw: data.output,
            };
        },
    },
});
