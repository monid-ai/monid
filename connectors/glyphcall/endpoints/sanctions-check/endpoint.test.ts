import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const input = { "address": "0x098B716B8Aaf21512996dC57EB0615e2383E2f96" };

Deno.test("glyphcall#sanctions/check happy (synthetic): the whole answer passes through, $0.009", async () => {
    const unit = await testSealedUnit("glyphcall#sanctions/check");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-sanctions-check.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: input },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.009 },
        evidence: { CALL: 1 },
    });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("glyphcall#sanctions/check provider error (isProviderError true, empty usage)", async () => {
    const unit = await testSealedUnit("glyphcall#sanctions/check");
    const fixture = await loadFixture(
        `${fixturesDir}provider-error-sanctions-check.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: input },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).message,
        "Payment required",
    );
});

Deno.test("glyphcall#sanctions/check input gate: a near-valid bad input is INVALID_INPUT, its near-twin passes", async () => {
    const unit = await testSealedUnit("glyphcall#sanctions/check");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-sanctions-check.json`,
    );
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    queryParams: {
                        "name": "Lazarus Group",
                        "lists": 123,
                    } as never,
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // the near-twin passes the schema and fails only later, at replay URL matching
    const error = await assertRejects(() =>
        runEndpoint({
            unit,
            input: {
                queryParams: { "name": "Lazarus Group", "lists": "ofac" },
            },
            mode: "replay",
            fixture,
        })
    );
    assert(
        !String((error as Error).message).includes("INVALID_INPUT"),
        String(error),
    );
});

Deno.test("glyphcall#sanctions/check input gate: no selector at all is INVALID_INPUT", async () => {
    const unit = await testSealedUnit("glyphcall#sanctions/check");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-sanctions-check.json`,
    );
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { queryParams: {} as never },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test({
    name: "glyphcall#sanctions/check live (gated on GLYPHCALL credentials)",
    ignore: liveSkip("glyphcall"),
    fn: async () => {
        const unit = await testSealedUnit("glyphcall#sanctions/check");
        const result = await runEndpoint({
            unit,
            input: { queryParams: input },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Record<string, unknown>;
        for (const key of ["query", "verdict", "listed", "matches"]) {
            assert(key in output, key);
        }
    },
});
