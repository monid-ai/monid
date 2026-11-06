import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("pressfront#understand: reads a situation as a story, bills $0.05", async () => {
    const unit = await testSealedUnit("pressfront#understand");
    assertEquals(unit.doc.request.method, "POST");
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                text: "people keep saying Lara went partying after the " +
                    "concert was cancelled, and Manon fans keep posting it",
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}understand-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.credits, { default: 0.05 });
    const u = (result.output as Record<string, unknown>).understood as Record<
        string,
        unknown
    >;
    assertEquals(u.kind, "claim");
    assertEquals(u.goal, "origin");
    assertEquals(u.query, "Lara went partying after the concert was cancelled");
    assert(Array.isArray(u.lines) && u.lines.length >= 1);
});

Deno.test("pressfront#understand: nothing to look up is a 422 and costs nothing", async () => {
    const unit = await testSealedUnit("pressfront#understand");
    const result = await runEndpoint({
        unit,
        input: { body: { text: "hmm" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}understand-unclear.json`),
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("pressfront#understand: text is required", async () => {
    const unit = await testSealedUnit("pressfront#understand");
    const fixture = await loadFixture(`${chains}understand-unclear.json`);
    for (
        const bad of [
            {},
            { text: "" },
            { name: "@quillandclaw" },
        ] as Record<string, Json>[]
    ) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body: bad },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(bad),
        );
    }
});
