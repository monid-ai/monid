import { defineProvider, UsageModelKind } from "@shared/core";
import { z } from "zod";

/**
 * FXMacroData (fxmacrodata.com) — official-source macroeconomic releases,
 * release calendars and FX reference rates for 22 currencies. Five
 * synchronous GET endpoints against `https://api.fxmacrodata.com/v1`.
 *
 * KEY OPTIONAL. USD announcements, the USD release calendar and the data
 * catalogue for every currency answer without a key (anonymous USD history
 * is the most recent 90 days, released values are delayed 15 minutes, and
 * each response says so in `freemium_window` / `freemium_delay`). Other
 * currencies and FX rates need a key and answer 401 `api_key_required`
 * without one. So `credentials` declares `apiKey` OPTIONAL and the inject
 * fn adds `X-API-Key` only when one resolved: unset, the request goes out
 * bare and the keyless surface still works.
 *
 * Billing: FXMacroData does not meter per call (a key is a flat
 * subscription, the keyless surface is free), and no response carries a
 * usage receipt, so every endpoint is FREE with no `consolidate`.
 */
export default defineProvider({
    name: "fxmacrodata",
    meta: {
        displayName: "FXMacroData",
        summary:
            "Official macroeconomic releases, release calendars and FX rates for 22 currencies.",
        description: "Macroeconomic data taken from central banks and " +
            "national statistics offices for 22 currencies (USD, EUR, " +
            "GBP, JPY, AUD, CAD, CHF, NZD, CNY and more): the latest " +
            "value of every indicator, full release history with " +
            "announcement timestamps and revisions, the upcoming release " +
            "calendar with exact scheduled times, daily FX reference " +
            "rates with optional technical indicators, and a catalogue " +
            "of which indicators each currency publishes. USD data and " +
            "the catalogue work without an API key; other currencies and " +
            "FX rates need one.",
        homepageUrl:
            "https://fxmacrodata.com/?utm_source=github&utm_medium=referral&utm_campaign=monid&utm_content=homepage",
        docsUrl:
            "https://fxmacrodata.com/documentation/reference?utm_source=github&utm_medium=referral&utm_campaign=monid&utm_content=docs",
        categories: ["economic-data"],
        notes: [
            "Without a key: USD announcements and calendar plus the " +
            "catalogue for every currency. USD history is limited to the " +
            "last 90 days and new releases appear 15 minutes after " +
            "publication.",
            "Other currencies and FX rates return 401 api_key_required " +
            "unless FXMACRODATA_API_KEY is set.",
        ],
    },
    auth: {
        // The key is optional: send it when present, otherwise go out bare.
        inject: ({ data }) =>
            data.params.apiKey
                ? {
                    ...data.request,
                    headers: {
                        ...data.request.headers,
                        "X-API-Key": data.params.apiKey,
                    },
                }
                : data.request,
        credentials: z.object({ apiKey: z.string().min(1).optional() }),
    },
    request: { baseUrl: "https://api.fxmacrodata.com" },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        model: { kind: UsageModelKind.FREE },
    },
});
