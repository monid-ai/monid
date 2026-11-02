import type { Json } from "@shared/core";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "stophy#google/maps/reviews";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy (recorded): 1 call, meter lifted out of the output`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { "placeId": "0x8644cc752bbe37bf:0x4a9e56f256689bb2" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}google-maps-reviews-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // keyless recording: the vendor meter says 0, so the derived fold bills
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { RESULT: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(Object.keys(output).sort(), ["data", "requestId", "success"]);
    const data = output.data as Record<string, unknown>;
    assertEquals((data.results as unknown[]).length, 2); // record trims
});

Deno.test(`${ID} empty results (synthetic): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { "placeId": "0x8644cc752bbe37bf:0x4a9e56f256689bb2" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-empty.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
});

Deno.test(`${ID} provider error (recorded 401): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { "placeId": "0x8644cc752bbe37bf:0x4a9e56f256689bb2" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}provider-error.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: placeUrl or placeId, not both`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}google-maps-reviews-ok.json`);
    const bad: Json[] = [{}, {
        "placeId": "x",
        "placeUrl": "https://maps.app.goo.gl/Xa3bN7cQ",
    }, { "placeId": "x", "sort": "oldest" }];
    for (const body of bad) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
        );
    }
    const good: Json[] = [{
        "placeUrl": "https://maps.app.goo.gl/Xa3bN7cQ",
        "sort": "lowest",
    }];
    for (const body of good) {
        const ok = await runEndpoint({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
        assertEquals(ok.isProviderError, false);
    }
});

Deno.test({
    name: `${ID} live (gated on STOPHY_API_KEY)`,
    ignore: liveSkip("stophy"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                body: { "placeId": "0x8644cc752bbe37bf:0x4a9e56f256689bb2" },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const data = (result.output as Record<string, unknown>)
            .data as Record<string, unknown>;
        assert(Array.isArray(data.results) && data.results.length > 0);
    },
});
