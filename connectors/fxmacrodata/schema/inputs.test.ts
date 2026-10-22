import { deepStrictEqual, strictEqual } from "node:assert";
import {
    zAnnouncementsQueryParams,
} from "../endpoints/announcements/schema/inputs.ts";
import { zForexQueryParams } from "../endpoints/forex/schema/inputs.ts";
import { zCurrency } from "./common.ts";

Deno.test("announcements accepts point-in-time and version controls", () => {
    for (const availability of ["public", "captured"] as const) {
        const query = {
            as_of: "2026-01-01T00:00:00Z",
            availability,
            dataset_version: "fixture-version",
        };
        deepStrictEqual(zAnnouncementsQueryParams.parse(query), query);
    }
    const nullable = { as_of: null, dataset_version: null };
    deepStrictEqual(zAnnouncementsQueryParams.parse(nullable), nullable);
});

Deno.test("announcements rejects unknown availability clocks", () => {
    for (const availability of ["ingested", "scheduled", "unknown"]) {
        strictEqual(
            zAnnouncementsQueryParams.safeParse({ availability }).success,
            false,
        );
    }
});

Deno.test("forex accepts nullable and string version pins", () => {
    for (const dataset_version of [null, "fixture-version"]) {
        const query = { dataset_version };
        deepStrictEqual(zForexQueryParams.parse(query), query);
    }
});

Deno.test("forex rejects announcements-only replay controls", () => {
    for (
        const query of [
            { as_of: "2026-01-01T00:00:00Z" },
            { availability: "public" },
        ]
    ) {
        strictEqual(zForexQueryParams.safeParse(query).success, false);
    }
});

Deno.test("shared currency metadata describes codes without an auth claim", () => {
    const expectedCurrencies = [
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
    ];
    deepStrictEqual([...zCurrency.options].sort(), expectedCurrencies);
    for (const currency of expectedCurrencies) {
        strictEqual(zCurrency.parse(currency), currency);
    }
    strictEqual(zCurrency.safeParse("XAU").success, false);
    strictEqual(/key|auth|non-USD/i.test(zCurrency.description ?? ""), false);
});
