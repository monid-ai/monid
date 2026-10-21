import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "dansugc#broll/filters";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test(`${ID} happy (recorded): free, the whole vocabulary relays`, async () => {
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {},
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} provider error (synthetic 401): zero usage, error digested`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {},
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}synthetic-provider-error.json`,
        ),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as { message: string }).message,
        "Invalid API key",
    );
});

Deno.test({
    name: `${ID} live (gated on DANSUGC_API_KEY)`,
    ignore: liveSkip("dansugc"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {},
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output).slice(0, 500),
        );
        assertEquals(
            Object.prototype.toString.call(result.output) === "[object Object]",
            true,
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
