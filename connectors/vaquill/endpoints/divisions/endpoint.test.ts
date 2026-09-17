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

const ID = "vaquill#us/statutes/divisions";
const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const INPUT = {
    queryParams: { corpusType: "USC", titleNumber: 42, chapter: "21" },
};

Deno.test(`${ID} happy: a level that exists bills its one credit`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}divisions-ok.json`),
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { RESULT: 1 },
    });
    // the vendor's receipt is consolidated away, never handed on
    assertEquals(
        "creditsConsumed" in (result.output as Record<string, Json>),
        false,
    );
    const output = result.output as Record<string, Json>;
    assert((output.divisions as unknown[]).length > 0);
});

Deno.test(`${ID} provider error: a 401 is data, and bills nothing`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { corpusType: "USC" } },
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}unauthorized-divisions.json`),
    });

    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, { detail: "Invalid or expired API key" });
});

Deno.test(`${ID} schema gate: corpusType is required, and the browse vocabulary is narrower than search's`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}divisions-ok.json`);
    // rejected BEFORE the wire: the fixture is never reached
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { queryParams: { titleNumber: 42 } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // the accepted twin, proving the gate is not simply rejecting
    // everything: naming the corpus is accepted. Checked through the PURE estimate, so
    // no fixture and no wire call is involved.
    assertEquals(
        await estimateEndpoint(unit, {
            queryParams: { corpusType: "USC", titleNumber: 42 },
        }),
        { credits: { default: 1 }, evidence: { RESULT: 1 } },
    );
});

Deno.test({
    name: `${ID} live (gated on VAQUILL_API_KEY)`,
    ignore: liveSkip("vaquill"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { queryParams: { corpusType: "USC", titleNumber: 42 } },
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
            (result.output as Record<string, Json>).divisions !== undefined,
        );
    },
});
