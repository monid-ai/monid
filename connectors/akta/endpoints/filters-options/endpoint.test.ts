import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    assertInputAccepted,
    estimateEndpoint,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "akta#v1/filters/options";

Deno.test("akta#v1/filters/options happy (synthetic): FREE lookup", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            body: {
                dropdowns: [{ dropdown_type: "firmographic.company_type" }],
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}synthetic-happy.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // the vendor meter is absorbed out of the payload
    const output = result.output as Record<string, unknown>;
    assertEquals("credits_consumed" in output, false);
});

Deno.test("akta#v1/filters/options estimate: matches the settled card", async () => {
    const usage = await estimateEndpoint(
        await testSealedUnit(ID),
        {
            body: {
                dropdowns: [{ dropdown_type: "firmographic.company_type" }],
            },
        },
    );
    assertEquals(usage, { credits: {}, evidence: {} });
});

Deno.test("akta#v1/filters/options schema gate: dropdowns needs at least one entry (v1 parity)", async () => {
    const unit = await testSealedUnit(ID);
    for (
        const [why, body] of [
            ["no dropdowns", { dropdowns: [] }],
        ] as [string, Record<string, Json>][]
    ) {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
            why,
        );
    }
    for (
        const body of [
            { dropdowns: [{ dropdown_type: "firmographic.company_type" }] },
        ] as Record<string, Json>[]
    ) {
        await assertInputAccepted({ unit, input: { body }, mode: "replay" });
    }
});
