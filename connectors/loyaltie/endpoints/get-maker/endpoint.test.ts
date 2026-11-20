import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import {
    expectedEnvelope,
    recordedStructuredContent,
    replayCapturing,
} from "../../test-wire.ts";

const ID = "loyaltie#get-maker";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

const BODY: Record<string, Json> = { maker: { id: "cimmacoffee" } };

Deno.test(`${ID} happy (recorded 2026-11-17): sends an attributed tools/call; returns the tool result unchanged; free`, async () => {
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const { result, sent } = await replayCapturing(ID, { body: BODY }, fixture);
    // what the compiled endpoint put on the wire, not the recording
    assertEquals(sent, [expectedEnvelope("get_maker", BODY)]);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // FREE model: nothing billed, nothing evidenced
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // the whole structuredContent survives unwrapping (no JSON-RPC envelope)
    const expected = recordedStructuredContent(fixture) as Record<string, Json>;
    assertEquals(result.output, expected);
    const maker = (result.output as Record<string, Record<string, Json>>)
        .maker;
    assertEquals(
        (maker.products as Json[]).length,
        ((expected.maker as Record<string, Json>).products as Json[]).length,
    );
    assertEquals((maker.products as Json[]).length, 2);
});

Deno.test(`${ID} provider error (synthetic 400): data, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: BODY },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
    });
});

Deno.test(`${ID} schema gate: an empty maker.id is rejected; the same id non-empty passes`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { maker: { id: "" } } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertInputAccepted({
        unit,
        input: { body: BODY },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name:
        `${ID} live (gated: the server is keyless; set LOYALTIE_API_KEY to any value to run)`,
    ignore: liveSkip("loyaltie"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: BODY },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as Record<string, unknown>;
        assert("ucp" in output, "UCP envelope present");
        const maker = output.maker as Record<string, unknown>;
        assertEquals(maker.link, "cimmacoffee");
        assert(Array.isArray(maker.products));
    },
});
