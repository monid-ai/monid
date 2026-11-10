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

Deno.test("frankki#quote happy (recorded 2026-10-27): FREE, envelope unwrapped", async () => {
    const unit = await testSealedUnit("frankki#quote");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { pageCount: 1, country: "DE" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // fromResponse returns the envelope's `data` and nothing else
    const body = fixture.calls[0].res.body as Record<string, unknown>;
    assertEquals(result.output, body.data);
});

Deno.test("frankki#quote provider error (recorded 2026-10-27): wrong key is 401, zero usage", async () => {
    const unit = await testSealedUnit("frankki#quote");
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { pageCount: 1, country: "DE" } },
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

Deno.test("frankki#quote schema gate: page count 1-95, two-letter country", async () => {
    const unit = await testSealedUnit("frankki#quote");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const rejected: Json[] = [
        { pageCount: 0, country: "DE" },
        { pageCount: 96, country: "DE" },
        { pageCount: 1, country: "DEU" },
        { pageCount: 1.5, country: "DE" },
        { country: "DE" },
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
        { pageCount: 95, country: "DE" },
        {
            pageCount: 1,
            country: "at",
            color: true,
            deliveryType: "einschreiben_einwurf",
        },
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
    name: "frankki#quote live (gated on FRANKKI_API_KEY)",
    ignore: liveSkip("frankki"),
    fn: async () => {
        const unit = await testSealedUnit("frankki#quote");
        const result = await runEndpoint({
            unit,
            input: { body: { pageCount: 2, country: "AT" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as Record<string, unknown>;
        assert(typeof output.userCents === "number");
        assert(Array.isArray(output.methods));
    },
});
