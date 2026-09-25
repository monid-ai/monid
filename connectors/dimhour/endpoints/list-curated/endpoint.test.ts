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

const ID = "dimhour#list-curated";
const TOOL = "list_curated";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = assertSmall({ body: { city: "dallas" } });

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
        [{ list_id: "x" }, "city is required"],
        [{ city: "dallas", list_id: 7 }, "list_id must be a string"],
        [{ city: "dallas", page: 2 }, "an unknown field"],
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
        [{ city: "dallas", list_id: "x" }, "city with a list_id"],
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
        assert(Array.isArray(out.lists), JSON.stringify(out).slice(0, 300));
    },
});
