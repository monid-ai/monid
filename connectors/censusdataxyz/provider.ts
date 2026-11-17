import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * censusdata.xyz — a hosted AI agent over the US Census Bureau API (not the
 * raw Census API): it resolves FIPS codes and variables from a plain-English
 * question and answers with a `summary` plus the `raw_data` it used. Ported
 * from monid-services `adaptors/census`.
 *
 * NAME: the brand is dotted, and a provider name must match
 * `^[a-z0-9][a-z0-9-]*$`, so the connector is `censusdataxyz` with
 * displayName "censusdata.xyz" — the `context.dev` → `contextdev` precedent
 * (add-connector-contextdev D1).
 *
 * Both endpoints are synchronous GETs with query params and `X-API-Key`.
 *
 * Usage: FREE. censusdata.xyz charges nothing — a free key carries a daily
 * query allowance, and an exhausted allowance answers 429 (data, zero
 * usage). Any price Monid puts on top is the broker's, not the vendor's.
 *
 * Output: every response carries `quota: {used, limit}`, the account's
 * daily allowance on the shared key. It is not part of the answer, so the
 * provider strips it — top level only (`pluck` is exact; `omit` is deep).
 */
export default defineProvider({
    name: "censusdataxyz",
    meta: {
        displayName: "censusdata.xyz",
        summary: "US Census data for any US geography, asked in plain " +
            "English.",
        description:
            "US Census Bureau data (American Community Survey 1-year " +
            "and 5-year) for any US state, county, city, metro area, or ZIP " +
            "code: population, median household income, poverty rate, " +
            "internet and broadband access, housing, rent, commute, " +
            "education, race, age, employment, health insurance, and 28,000+ " +
            "other indicators. Ask in plain English; the agent resolves " +
            "places and variables itself.",
        homepageUrl: "https://censusdata.xyz",
        docsUrl: "https://censusdata.xyz/skill",
        categories: ["government-data"],
    },
    auth: { inject: presets.auth.header("X-API-Key") },
    request: { baseUrl: "https://censusdata.xyz" },
    // monid-services parity: endpointExecution/config.yml gives
    // censusdata.xyz 30 s for the single sync GET.
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
    output: {
        fromResponse: ({ data, utils }) =>
            utils.json.pluck(data.output, "$.quota").rest,
    },
});
