import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "fxmacrodata#v1/calendar/{currency}";
const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const INPUT = {
    pathParams: { currency: "USD" },
    queryParams: {
        indicator: "inflation",
        start_date: "2026-10-01",
        end_date: "2026-12-31",
    },
};

Deno.test(`${ID} happy (recorded, keyless USD): scheduled releases, nearest first`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${FIXTURES}calendar-usd-inflation-ok.json`,
    );
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);

    const rows = (result.output as Record<string, Json>).data as Record<
        string,
        Json
    >[];
    assertEquals(rows.length, 2);
    for (const row of rows) {
        assertEquals(row.release, "inflation");
        assertEquals(row.time_announced, true);
    }
    const times = rows.map((row) => row.announcement_datetime as number);
    assertEquals(times, [...times].sort((a, b) => a - b));
});

Deno.test(`${ID}: COMM accepted as a calendar; unknown currency and keys rejected`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${FIXTURES}calendar-usd-inflation-ok.json`,
    );
    const rejected: RunInput[] = [
        {},
        { pathParams: { currency: "XYZ" } },
        { pathParams: { currency: "USD" }, queryParams: { bogus: 1 } },
    ];
    for (const input of rejected) {
        await assertRejects(
            () => runEndpoint({ unit, input, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(input),
        );
    }
    // COMM passes the gate; the replay then fails on the URL, not the input
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { pathParams: { currency: "COMM" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "replay(",
    );
});

Deno.test({
    name: `${ID} live (gated on FXMACRODATA_API_KEY)`,
    ignore: liveSkip("fxmacrodata"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { pathParams: { currency: "JPY" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Record<string, Json>;
        assertEquals(output.currency, "JPY");
        assertEquals(Array.isArray(output.data), true);
    },
});
