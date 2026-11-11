import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    assertInputAccepted,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "citable#api/check";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test(`${ID} happy: the whole report, free, no credentials`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { url: "example.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} provider error: a 400 is data, zero usage, body untouched`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { url: "localhost" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        error: "Give ?url=, for example ?url=example.com",
    });
});

Deno.test(`${ID}: the schema gate — url is required, fresh is only "1", and "1" passes`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const run = (input: Record<string, unknown>) =>
        runEndpoint({
            unit,
            input: { queryParams: input as Record<string, Json> },
            mode: "replay",
            fixture,
        });
    for (
        const bad of [
            {},
            { url: "" },
            { url: "example.com", fresh: "0" },
            { url: "example.com", extra: "x" },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    // the near twin: `fresh: "1"` clears the gate (it then misses the replay
    // URL, which is the point: validation let it through)
    await assertInputAccepted({
        unit,
        input: { queryParams: { url: "example.com", fresh: "1" } },
        mode: "replay",
        fixture,
    });
});

// liveSkip("citable", []) is always true (it opens only when every declared
// credential field is set, and this provider has none), so a keyless provider
// gates its live test on an explicit variable instead.
Deno.test({
    name: `${ID} live (no key needed; set CITABLE_LIVE=1 to run)`,
    ignore: Deno.env.get("CITABLE_LIVE") !== "1",
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { queryParams: { url: "example.com" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output).slice(0, 500),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        // shape, never values: the score of a live page moves
        const report = result.output as Record<string, unknown>;
        assertEquals(typeof report.score, "number");
        assertEquals(typeof report.grade, "string");
        assert(Array.isArray(report.checks));
    },
});
