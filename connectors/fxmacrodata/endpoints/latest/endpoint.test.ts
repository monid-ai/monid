import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "fxmacrodata#v1/announcements/{currency}/latest";
const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy (recorded, keyless USD): latest + previous per indicator, free`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}latest-usd-ok.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { currency: "USD" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);

    const output = result.output as Record<string, Json>;
    assertEquals(output.currency, "USD");
    const rows = output.data as Record<string, Json>[];
    assertEquals(rows.map((row) => row.indicator), [
        "inflation",
        "unemployment",
    ]);
    for (const row of rows) {
        const latest = row.latest as Record<string, Json>;
        assertEquals(typeof latest.val, "number");
        assertEquals(typeof latest.announcement_datetime, "number");
    }
    // the keyless response says how far behind real time it is
    const delay = output.freemium_delay as Record<string, Json>;
    assertEquals(delay.delay_minutes, 15);
});

Deno.test(`${ID}: currency required and must be one of the 22 codes`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}latest-usd-ok.json`);
    const rejected: RunInput[] = [
        {},
        { pathParams: {} },
        { pathParams: { currency: "COMM" } },
        { pathParams: { currency: "US" } },
    ];
    for (const input of rejected) {
        await assertRejects(
            () => runEndpoint({ unit, input, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(input),
        );
    }
});

Deno.test({
    name: `${ID} live (gated on FXMACRODATA_API_KEY)`,
    ignore: liveSkip("fxmacrodata"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { pathParams: { currency: "GBP" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Record<string, Json>;
        assertEquals(output.currency, "GBP");
        assertEquals(Array.isArray(output.data), true);
    },
});
