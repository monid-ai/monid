import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "apiindonesia#gempa/terkini";
const fixtures = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = {};

Deno.test(`${ID} happy (recorded): 2 credits per successful call`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(`${fixtures}happy.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assert("data" in output, "data envelope present");
});

Deno.test({
    name: `${ID} live (gated on APIINDONESIA_API_KEY)`,
    ignore: liveSkip("apiindonesia"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({ unit, input: INPUT, mode: "live" });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.evidence, { CALL: 1 });
    },
});

Deno.test(`${ID} invalid key (recorded 401): error is data, zero usage, code lifted`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture: await loadFixture(`${fixtures}unauthorized.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.code, "INVALID_API_KEY");
    assertEquals(typeof output.message, "string");
});
