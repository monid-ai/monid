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

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("frankki#track happy (recorded 2026-10-27): FREE, envelope unwrapped", async () => {
    const unit = await testSealedUnit("frankki#track");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: { trackingToken: "trk_recorded000000000000000000000000" },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // fromResponse returns the envelope's `data` and nothing else
    const body = fixture.calls[0].res.body as Record<string, unknown>;
    assertEquals(result.output, body.data);
    // the recorded letter was never paid, so no order exists yet
    assertEquals(result.output, { status: "not_found" });
});

Deno.test("frankki#track provider error (recorded 2026-10-27): wrong key is 401, zero usage", async () => {
    const unit = await testSealedUnit("frankki#track");
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: { trackingToken: "trk_recorded000000000000000000000000" },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.code, "UNAUTHORIZED");
    assertEquals(typeof output.message, "string");
    assertEquals((output.raw as Record<string, unknown>).status, "error");
});

Deno.test("frankki#track schema gate: tracking token 20-200 characters", async () => {
    const unit = await testSealedUnit("frankki#track");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const rejected: Json[] = [
        { trackingToken: "x".repeat(19) },
        { trackingToken: "x".repeat(201) },
        {},
    ];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body),
        );
    }
    // near-twins: the gate is not wider than the vendor contract
    const accepted: Json[] = [
        { trackingToken: "x".repeat(20) },
        { trackingToken: "x".repeat(200) },
    ];
    for (const body of accepted) {
        await assertInputAccepted({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
    }
});

Deno.test({
    name: "frankki#track live (gated on FRANKKI_API_KEY)",
    ignore: liveSkip("frankki"),
    fn: async () => {
        const unit = await testSealedUnit("frankki#track");
        const result = await runEndpoint({
            unit,
            input: {
                body: { trackingToken: "trk_not_a_real_token_000000000" },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as Record<string, unknown>;
        assertEquals(output.status, "not_found");
    },
});
