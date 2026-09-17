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

const ID = "vaquill#us/statutes/resolve";
const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const INPUT = { body: { citations: ["42 U.S.C. 1983", "99 Z.Z.C. 12345"] } };

Deno.test(`${ID} happy: both citations bill, because the lookup ran on both`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}resolve-partial-ok.json`),
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 4 },
        evidence: { RESULT: 2 },
    });
    // the vendor's receipt is consolidated away, never handed on
    assertEquals(
        "creditsConsumed" in (result.output as Record<string, Json>),
        false,
    );
    const output = result.output as Record<string, Json>;
    assertEquals((output.results as unknown[]).length, 2);
    // one of the two did not resolve, and was still billed
    assertEquals(output.resolvedCount, 1);
});

Deno.test(`${ID} provider error: a 401 is data, and bills nothing`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}unauthorized-resolve.json`),
    });

    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, { detail: "Invalid or expired API key" });
});

Deno.test(`${ID} schema gate: an empty citations is refused`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}resolve-partial-ok.json`);
    // rejected BEFORE the wire: the fixture is never reached
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { citations: [] } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // the accepted twin, proving the gate is not simply rejecting
    // everything: one citation is accepted. Checked through the PURE estimate, so
    // no fixture and no wire call is involved.
    assertEquals(
        await estimateEndpoint(unit, {
            body: { citations: ["42 U.S.C. 1983"] },
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
            input: { body: { citations: ["42 U.S.C. 1983"] } },
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
        assertEquals(
            ((result.output as Record<string, Json>).results as unknown[])
                .length,
            1,
        );
    },
});
