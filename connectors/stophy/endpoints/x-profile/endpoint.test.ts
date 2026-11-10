import type { Json } from "@shared/core";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "stophy#x/profile";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy (recorded): flat 1 call, meter lifted out of the output`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { "username": "nasa" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}x-profile-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(Object.keys(output).sort(), ["data", "requestId", "success"]);
    const data = output.data as Record<string, unknown>;
    assertEquals(typeof data.username, "string");
});

Deno.test(`${ID} provider error (recorded 401): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { "username": "nasa" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}provider-error.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate: profileUrl or username, not both`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}x-profile-ok.json`);
    const bad: Json[] = [{}, {
        "username": "nasa",
        "profileUrl": "https://x.com/nasa",
    }, { "handle": "nasa" }];
    for (const body of bad) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
        );
    }
    const good: Json[] = [{ "profileUrl": "https://x.com/nasa" }];
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
            input: { body: { "username": "nasa" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const data = (result.output as Record<string, unknown>)
            .data as Record<string, unknown>;
        assert(typeof data.username === "string");
    },
});
