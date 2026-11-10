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

Deno.test("frankki#checkout happy (recorded 2026-10-27): FREE, envelope unwrapped", async () => {
    const unit = await testSealedUnit("frankki#checkout");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                draftToken: "dft_recorded000000000000000000000000",
                locale: "en",
            },
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
    const output = result.output as Record<string, unknown>;
    assertEquals(output.amountCents, 349);
    assert(String(output.checkoutUrl).startsWith("https://mcp.frankki.app/"));
});

Deno.test("frankki#checkout provider error (recorded 2026-10-27): wrong key is 401, zero usage", async () => {
    const unit = await testSealedUnit("frankki#checkout");
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { draftToken: "dft_recorded000000000000000000000000" } },
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

Deno.test("frankki#checkout review hold (synthetic): the 202 keeps its code", async () => {
    const unit = await testSealedUnit("frankki#checkout");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-review-pending.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { draftToken: "dft_syntheticsyntheticsynthetic" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 202);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).code,
        "CONTENT_REVIEW_PENDING",
    );
});

Deno.test("frankki#checkout schema gate: locale de or en", async () => {
    const unit = await testSealedUnit("frankki#checkout");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const rejected: Json[] = [
        { draftToken: "x".repeat(20), locale: "fr" },
        { draftToken: "x".repeat(19) },
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
        { draftToken: "x".repeat(20), locale: "de" },
        { draftToken: "x".repeat(20) },
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
    name:
        "frankki#checkout live (gated on FRANKKI_API_KEY) (unknown draft answers NOT_FOUND)",
    ignore: liveSkip("frankki"),
    fn: async () => {
        const unit = await testSealedUnit("frankki#checkout");
        const result = await runEndpoint({
            unit,
            input: { body: { draftToken: "dft_not_a_real_draft_000000000" } },
            mode: "live",
        });
        assertEquals(result.httpStatus, 404);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as Record<string, unknown>;
        assertEquals(output.code, "NOT_FOUND");
    },
});
