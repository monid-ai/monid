import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { RunInput } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "apiindonesia#bpom";
const fixtures = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = { "queryParams": { "q": "indomie" } };

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

Deno.test(`${ID} schema gate: rejects bad input before any call`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixtures}happy.json`);
    const rejected = [{
        "queryParams": { "q": "indomie", "bogus_filter": "x" },
    }, { "queryParams": {} }] as RunInput[];
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
