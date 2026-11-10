import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "fxmacrodata#v1/forex/{base}/{quote}";
const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const INPUT = {
    pathParams: { base: "EUR", quote: "USD" },
    queryParams: { limit: 2 },
};

Deno.test(`${ID} without a key (recorded 401): provider error, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}forex-keyless-401.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, Json>;
    assertEquals(output.code, "api_key_required");
});

Deno.test(`${ID}: pair from the 22 codes; limit 1-100; unknown keys rejected`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}forex-keyless-401.json`);
    const path = INPUT.pathParams;
    const rejected: RunInput[] = [
        {},
        { pathParams: { base: "EUR" } },
        { pathParams: { base: "EUR", quote: "XAU" } },
        { pathParams: path, queryParams: { limit: 0 } },
        { pathParams: path, queryParams: { limit: 101 } },
        { pathParams: path, queryParams: { page: 0 } },
        // point-in-time replay is an announcements control, not FX
        { pathParams: path, queryParams: { as_of: "2026-01-01T00:00:00Z" } },
        { pathParams: path, queryParams: { availability: "public" } },
        { pathParams: path, queryParams: { bogus: 1 } },
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
            input: {
                pathParams: { base: "EUR", quote: "USD" },
                queryParams: { limit: 5, indicators: "sma_20,rsi_14" },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Record<string, Json>;
        assertEquals(output.base, "EUR");
        assertEquals(output.quote, "USD");
        const rows = output.data as Record<string, Json>[];
        assertEquals(rows.length, 5);
        assertEquals(typeof rows[0].val, "number");
    },
});
