import { z } from "zod";

/**
 * Fragments shared by two or more fxmacrodata endpoints, mirrored from the
 * published OpenAPI (https://fxmacrodata.com/documentation/reference):
 * optionality only, bounds at the binding (design D25).
 */

/** The 22 currencies the announcement, catalogue and FX paths accept. */
export const CURRENCIES = [
    "AUD",
    "BRL",
    "CAD",
    "CHF",
    "CNH",
    "CNY",
    "DKK",
    "EUR",
    "GBP",
    "HUF",
    "ILS",
    "JPY",
    "KRW",
    "MYR",
    "NGN",
    "NOK",
    "NZD",
    "PEN",
    "SEK",
    "THB",
    "TWD",
    "USD",
] as const;

export const zCurrency = z.enum(CURRENCIES).describe(
    "Three-letter currency code, upper case.",
);

export const zCurrencyPathParams = z.object({ currency: zCurrency });

/**
 * Indicator slugs (`inflation`, `gdp`, `policy_rate`, `non_farm_payrolls`,
 * ...). The published enum is the union over every currency and grows
 * with coverage, so the mirror is a string; the per-currency list is what
 * `fxmacrodata#v1/data_catalogue/{currency}` returns.
 */
export const zIndicator = z.string().describe(
    "Indicator slug, for example `inflation`, `gdp`, `policy_rate` or " +
        "`unemployment`. List the slugs a currency publishes with " +
        "/v1/data_catalogue/{currency}.",
);

export const zDate = z.string().describe("Date as YYYY-MM-DD.");
