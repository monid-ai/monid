import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("askbots#projects synthetic-empty: replays as success (200), zero usage", async () => {
    const unit = await testSealedUnit("askbots#projects");
    const fixture = await loadFixture(`${fixturesDir}synthetic-empty.json`);
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // no output transform: the vendor body passes through untouched
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("askbots#projects synthetic-open: replays as success (200), zero usage", async () => {
    const unit = await testSealedUnit("askbots#projects");
    const fixture = await loadFixture(`${fixturesDir}synthetic-open.json`);
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // no output transform: the vendor body passes through untouched
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test({
    name: "askbots#projects live (gated on ASKBOTS_API_KEY)",
    ignore: liveSkip("askbots"),
    fn: async () => {
        const unit = await testSealedUnit("askbots#projects");
        const result = await runEndpoint({ unit, input: {}, mode: "live" });
        assertEquals(result.httpStatus, 200);
        assert(
            Array.isArray((result.output as { projects: unknown[] }).projects),
        );
    },
});
