import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";
import {
    assertRpcError,
    assertToolError,
    assertToolsCall,
    captureRun,
    liveOff,
    noIoEngine,
    ONE_CALL,
    providerFixture,
    structuredOf,
} from "../../testing.ts";

const ID = "dimhour#list-cities";
const TOOL = "list_cities";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = {};

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

Deno.test(`${ID} request: POST /mcp, tools/call "${TOOL}", empty params.arguments`, async () => {
    const { sent } = await captureRun(
        await testSealedUnit(ID),
        INPUT,
        await loadFixture(`${fixturesDir}happy.json`),
    );
    assertToolsCall(sent, TOOL, {});
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

/**
 * No schema gate to test: the live `list_cities` takes no input, so this
 * endpoint declares no body schema and the engine does not reject a stray
 * body. What holds instead is that toRequest never forwards one: the wire
 * arguments stay `{}` whatever the caller sends.
 */
Deno.test(`${ID} no body schema: a stray body is accepted and never reaches the wire`, async () => {
    const stray = { body: { bulk: true, limit: 500 } };
    const loaded = await noIoEngine().load(await testSealedUnit(ID));
    assertEquals(await loaded.estimate(stray), ONE_CALL);
    const { sent } = await captureRun(
        await testSealedUnit(ID),
        stray,
        await loadFixture(`${fixturesDir}happy.json`),
    );
    assertToolsCall(sent, TOOL, {});
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
        assert(Array.isArray(out.cities), JSON.stringify(out).slice(0, 300));
    },
});
