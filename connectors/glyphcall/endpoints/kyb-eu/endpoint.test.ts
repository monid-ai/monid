import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const input = { "q": "Spotify" };

Deno.test("glyphcall#pack/kyb-eu happy (synthetic): the whole answer passes through, $0.02", async () => {
    const unit = await testSealedUnit("glyphcall#pack/kyb-eu");
    const fixture = await loadFixture(`${fixturesDir}synthetic-kyb-eu.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: input },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.02 },
        evidence: { CALL: 1 },
    });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("glyphcall#pack/kyb-eu provider error (isProviderError true, empty usage)", async () => {
    const unit = await testSealedUnit("glyphcall#pack/kyb-eu");
    const fixture = await loadFixture(
        `${fixturesDir}provider-error-kyb-eu.json`,
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

Deno.test("glyphcall#pack/kyb-eu input gate: a near-valid bad input is INVALID_INPUT, its near-twin passes", async () => {
    const unit = await testSealedUnit("glyphcall#pack/kyb-eu");
    const fixture = await loadFixture(`${fixturesDir}synthetic-kyb-eu.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { queryParams: { "q": 42 } as never },
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
            input: { queryParams: { "q": "Volvo" } },
            mode: "replay",
            fixture,
        })
    );
    assert(
        !String((error as Error).message).includes("INVALID_INPUT"),
        String(error),
    );
});

Deno.test("glyphcall#pack/kyb-eu input gate: no selector at all is INVALID_INPUT", async () => {
    const unit = await testSealedUnit("glyphcall#pack/kyb-eu");
    const fixture = await loadFixture(`${fixturesDir}synthetic-kyb-eu.json`);
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
    name: "glyphcall#pack/kyb-eu live (gated on GLYPHCALL credentials)",
    ignore: liveSkip("glyphcall"),
    fn: async () => {
        const unit = await testSealedUnit("glyphcall#pack/kyb-eu");
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
        for (const key of ["query", "verdict", "flags", "company"]) {
            assert(key in output, key);
        }
    },
});
