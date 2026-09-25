import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";
import {
    assertRpcError,
    assertSmall,
    assertToolError,
    assertToolsCall,
    captureRun,
    liveOff,
    noIoEngine,
    ONE_CALL,
    providerFixture,
    structuredOf,
} from "../../testing.ts";

const ID = "dimhour#find-places";
const TOOL = "find_places";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = assertSmall({
    body: { city: "dallas", looking_for: "patio", limit: 2 },
});

Deno.test(`${ID} happy: structuredContent comes back without the MCP envelope, one call billed`, async () => {
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, ONE_CALL);
    assertEquals(result.output, structuredOf(fixture));
    const out = result.output as Record<string, unknown>;
    for (const envelopeKey of ["jsonrpc", "result", "content"]) {
        assert(!(envelopeKey in out), `${envelopeKey} leaked`);
    }
});

Deno.test(`${ID} request: POST /mcp, tools/call "${TOOL}", the input as params.arguments`, async () => {
    const { sent } = await captureRun(
        await testSealedUnit(ID),
        INPUT,
        await loadFixture(`${fixturesDir}happy.json`),
    );
    assertToolsCall(sent, TOOL, INPUT.body as Json);
});

Deno.test(`${ID} JSON-RPC top-level error in a 200: a 502 provider error, zero usage`, async () => {
    assertRpcError(
        await runEndpoint({
            unit: await testSealedUnit(ID),
            input: INPUT,
            mode: "replay",
            fixture: await providerFixture("rpc-error"),
        }),
    );
});

Deno.test(`${ID} result.isError in a 200: a 502 provider error, zero usage`, async () => {
    assertToolError(
        await runEndpoint({
            unit: await testSealedUnit(ID),
            input: INPUT,
            mode: "replay",
            fixture: await providerFixture("tool-error"),
        }),
    );
});

Deno.test(`${ID} schema gate: the source's bounds, required fields and strictness reject before the wire`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const rejected: [Record<string, Json>, string][] = [
        [{ looking_for: "patio" }, "city is required"],
        [{ city: "dallas", limit: 26 }, "limit above the source's max 25"],
        [{ city: "dallas", limit: 0 }, "limit below the source's min 1"],
        [{ city: "dallas", max_price: 5 }, "max_price above tier 4"],
        [{ city: "dallas", max_price: 0 }, "max_price below tier 1"],
        [{ city: "dallas", party_size: 4 }, "an unknown field"],
    ];
    for (const [body, why] of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            `${why}: ${JSON.stringify(body)}`,
        );
    }
});

Deno.test(`${ID} schema gate: the passing near-twins at each boundary (no IO)`, async () => {
    const loaded = await noIoEngine().load(await testSealedUnit(ID));
    const accepted: [Record<string, Json>, string][] = [
        [{ city: "dallas", limit: 25 }, "limit at the max"],
        [{ city: "dallas", limit: 1 }, "limit at the min"],
        [{ city: "dallas", max_price: 4 }, "max_price at tier 4"],
        [{ city: "dallas", max_price: 1 }, "max_price at tier 1"],
        [{ city: "dallas" }, "city alone"],
    ];
    for (const [body, why] of accepted) {
        assertEquals(
            await loaded.estimate({ body }),
            ONE_CALL,
            `${why}: ${JSON.stringify(body)}`,
        );
    }
});

Deno.test({
    name: `${ID} live (opt-in: DIMHOUR_LIVE=1, no credential)`,
    ignore: liveOff(),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: INPUT,
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output).slice(0, 300),
        );
        assert("credits" in result.usage && "evidence" in result.usage);
        const out = result.output as Record<string, unknown>;
        assert(!("jsonrpc" in out), "envelope leaked");
        assert(Array.isArray(out.venues), JSON.stringify(out).slice(0, 300));
    },
});
