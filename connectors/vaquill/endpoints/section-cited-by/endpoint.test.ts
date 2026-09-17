import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "vaquill#us/statutes/section/{act_id}/cited-by";
const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const INPUT = {
    pathParams: { act_id: "USC_T42_C21_S1983" },
    queryParams: { limit: 2 },
};

Deno.test(`${ID} happy: one answered lookup, whatever the citer count`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}cited-by-ok.json`),
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { RESULT: 1 },
    });
    // the vendor's receipt is consolidated away, never handed on
    assertEquals(
        "creditsConsumed" in (result.output as Record<string, Json>),
        false,
    );
    const output = result.output as Record<string, Json>;
    assert((output.citers as unknown[]).length > 0);
});

Deno.test(`${ID} provider error: a 401 is data, and bills nothing`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { act_id: "USC_T42_C21_S1983" } },
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}unauthorized-cited-by.json`),
    });

    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, { detail: "Invalid or expired API key" });
});

Deno.test(`${ID} schema gate: limit above the vendor's 100 is refused`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}cited-by-ok.json`);
    // rejected BEFORE the wire: the fixture is never reached
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    pathParams: { act_id: "USC_T42_C21_S1983" },
                    queryParams: { limit: 101 },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // the accepted twin, proving the gate is not simply rejecting
    // everything: 100 is accepted. Checked through the PURE estimate, so
    // no fixture and no wire call is involved.
    assertEquals(
        await estimateEndpoint(unit, {
            pathParams: { act_id: "USC_T42_C21_S1983" },
            queryParams: { limit: 100 },
        }),
        { credits: { default: 2 }, evidence: { RESULT: 1 } },
    );
});

Deno.test({
    name: `${ID} live (gated on VAQUILL_API_KEY)`,
    ignore: liveSkip("vaquill"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                pathParams: { act_id: "USC_T42_C21_S1983" },
                queryParams: { limit: 2 },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // shape, not amounts: the corpus moves, so pin the pool settled
        // rather than a figure
        assertEquals(typeof result.usage.credits.default, "number");
        assert(
            (result.output as Record<string, Json>).citers !== undefined,
        );
    },
});
