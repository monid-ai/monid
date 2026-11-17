import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * API Indonesia (apiindonesia.id) — Indonesian public and reference data as
 * JSON: administrative regions, postal codes, national holidays, prayer
 * times, schools, universities, hospitals, BMKG earthquakes and weather,
 * Bank Indonesia rates, DJKI trademarks, halal and BPOM registries, the KBBI
 * dictionary, provincial minimum wage, the OJK illegal-investment list, LEI
 * records and the Hijri calendar. Synchronous REST GETs against
 * `https://use.apiindonesia.id/api/v1`, auth `x-api-key`. Submitted by the
 * vendor (Khaisa Studio).
 *
 * Rate card (src/lib/pricing.ts in the vendor repo, https://apiindonesia.id
 * pricing section, verified 2026-11-02): one API Indonesia credit is one
 * rupiah, and every generic data endpoint costs 2 credits per SUCCESSFUL
 * request. A non-2xx answer (400 validation, 404 not found, 401 key) is
 * refunded by the vendor, which matches the engine's zero settle on
 * provider errors. Responses carry no per-call usage receipt, so there is
 * no `consolidate` and the derived fold is the bill: flat PER_CALL 2.
 *
 * Every endpoint here is a sync GET with query or path params only. The
 * vendor's account, billing and paid-only products (image upscale, AI
 * gateway, email verification) are not exposed.
 */
export default defineProvider({
    name: "apiindonesia",
    meta: {
        displayName: "API Indonesia",
        summary: "Indonesian public data for agents: regions, postal codes, " +
            "holidays, prayer times, schools, BMKG, BPOM, halal, trademarks.",
        description: "API Indonesia turns Indonesian government and " +
            "reference datasets into one clean JSON API: the official " +
            "Kemendagri region tree and postal codes (with BPS " +
            "crosswalk), national holidays and cuti bersama, prayer " +
            "times per regency, the national school, university and " +
            "hospital directories, BMKG earthquakes and weather " +
            "forecasts, Bank Indonesia exchange rates, DJKI trademark " +
            "search, BPJPH halal and BPOM product registries, the KBBI " +
            "dictionary, provincial minimum wage, the OJK illegal " +
            "investment list, LEI records for Indonesian entities and the " +
            "Indonesian Hijri calendar. Region codes from " +
            "`apiindonesia#wilayah/search` link the endpoints together. " +
            "Field names follow the source data, mostly in Indonesian.",
        homepageUrl: "https://apiindonesia.id",
        docsUrl: "https://docs.apiindonesia.id/en/docs/",
        categories: ["government-data"],
    },
    auth: { inject: presets.auth.header("x-api-key") },
    request: { baseUrl: "https://use.apiindonesia.id/api/v1" },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        /** THE credit system (design D26): API Indonesia meters in its own
         *  credits, 1 credit = IDR 1. The IDR to USD conversion stays the
         *  broker card's job. */
        credits: {
            default: { label: "API Indonesia credits (1 credit = IDR 1)" },
        },
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "successful request",
            consumes: { credit: "default", amount: 2 },
        },
    },
    output: {
        /** Every API Indonesia error is `{success: false, error: {code,
         *  message}}` (e.g. `INVALID_API_KEY`, `VALIDATION_ERROR`,
         *  `NOT_FOUND`). Lift both so an agent can branch on `code`. */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(
                data.output,
                "$.error.message",
            );
            const code = utils.json.optionalGet(data.output, "$.error.code");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "API Indonesia error",
                ...(typeof code === "string" ? { code } : {}),
                raw: data.output,
            };
        },
    },
});
