import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "fxmacrodata#v1/data_catalogue/{currency}";
const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy (recorded, keyless): entries keyed by slug, free`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}catalogue-usd-ok.json`);
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
    const inflation = (result.output as Record<string, Record<string, Json>>)
        .inflation;
    assertEquals(inflation.unit, "%YoY");
    assertEquals(
        (inflation.coverage as Record<string, Json>).requires_api_key,
        false,
    );
});

Deno.test(`${ID}: currency must be one of the 22 codes; unknown query keys rejected`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}catalogue-usd-ok.json`);
    const rejected: RunInput[] = [
        {},
        { pathParams: { currency: "usd" } },
        { pathParams: { currency: "XYZ" } },
        { pathParams: { currency: "USD" }, queryParams: { bogus: 1 } },
        {
            pathParams: { currency: "USD" },
            queryParams: { include_coverage: "yes" },
        },
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
            input: { pathParams: { currency: "EUR" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as Record<string, Json>;
        assertEquals(typeof output.inflation, "object");
    },
});
